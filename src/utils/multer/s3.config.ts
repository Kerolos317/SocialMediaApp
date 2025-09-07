import {
    S3Client,
    PutObjectCommand,
    ObjectCannedACL,
    GetObjectCommand,
    GetObjectCommandOutput,
    DeleteObjectCommand,
    DeleteObjectCommandOutput,
    DeleteObjectsCommand,
    DeleteObjectsCommandOutput,
    ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { v4 as uuid } from "uuid";
import { StorageEnum } from "./cloud.multer";
import { createReadStream } from "fs";
import { BadRequestException } from "../response/error.response";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3Config = () => {
    return new S3Client({
        region: process.env.AWS_REGION as string,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
        },
    });
};

export const uploadFile = async ({
    storageApproach = StorageEnum.memory,
    Bucket = process.env.AWS_BUCKET_NAME,
    ACL = "private",
    path = "general",
    file,
}: {
    storageApproach?: StorageEnum;
    Bucket?: string;
    ACL?: ObjectCannedACL;
    path?: string;
    file: Express.Multer.File;
}): Promise<string> => {
    const command = new PutObjectCommand({
        Bucket,
        ACL,
        Key: `${process.env.APPLICATION_NAME}/${path}/${uuid()}_${
            file.originalname
        }`,
        Body:
            storageApproach === StorageEnum.memory
                ? file.buffer
                : createReadStream(file.path),
        ContentType: file.mimetype,
    });

    await s3Config().send(command);
    if (!command.input.Key) {
        throw new BadRequestException("File upload failed");
    }
    return command.input.Key;
};

export const uploadFiles = async ({
    files,
    storageApproach = StorageEnum.memory,
    path = "general",
    Bucket = process.env.AWS_BUCKET_NAME as string,
    ACL = "private" as ObjectCannedACL,
    useLarge = false,
}: {
    storageApproach?: StorageEnum;
    Bucket?: string;
    path?: string;
    ACL?: ObjectCannedACL;
    files: Express.Multer.File[];
    useLarge?: boolean;
}): Promise<string[]> => {
    if (useLarge) {
        const urls: string[] = await Promise.all(
            files.map((file) =>
                uploadLargeFile({ storageApproach, Bucket, ACL, path, file })
            )
        );
        return urls;
    } else {
        const urls: string[] = await Promise.all(
            files.map((file) =>
                uploadFile({ storageApproach, Bucket, ACL, path, file })
            )
        );
        return urls;
    }
};

export const uploadLargeFile = async ({
    storageApproach = StorageEnum.memory,
    Bucket = process.env.AWS_BUCKET_NAME as string,
    path = "general",
    ACL = "private" as ObjectCannedACL,
    file,
}: {
    storageApproach?: StorageEnum;
    Bucket?: string;
    path?: string | undefined;
    ACL?: ObjectCannedACL;
    file: Express.Multer.File;
}): Promise<string> => {
    const upload = new Upload({
        client: s3Config(),
        params: {
            Bucket,
            Key: `${
                process.env.APPLICATION_NAME
            }/${path}/${Date.now()}__${Math.random()}_250/${file.originalname}`,
            ACL,
            Body:
                storageApproach === StorageEnum.memory
                    ? file.buffer
                    : createReadStream(file.path),
            ContentType: file.mimetype,
        },
    });

    upload.on("httpUploadProgress", (progress) => {
        console.log(`File upload progress is ::: `, progress);
    });
    const { Key } = await upload.done();
    if (!Key) {
        throw new BadRequestException("File upload failed");
    }
    return Key;
};

export const createPreSignedUploadLink = async ({
    Bucket = process.env.AWS_BUCKET_NAME as string,
    path = "general",
    expiresIn = 120,
    ContentType,
    originalname,
}: {
    Bucket?: string;
    path?: string;
    expiresIn?: number;
    ContentType: string;
    originalname: string;
}): Promise<{ url: string; key: string }> => {
    const command = new PutObjectCommand({
        Bucket,
        Key: `${
            process.env.APPLICATION_NAME
        }/${path}/${uuid()}_${originalname}`,
        ContentType,
    });

    const url = await getSignedUrl(s3Config(), command, { expiresIn });
    if (!url || !command.input.Key) {
        throw new BadRequestException("failed to create Presigned url");
    }
    return { url, key: command.input.Key };
};

export const createGetPreSignedLink = async ({
    Bucket = process.env.AWS_BUCKET_NAME as string,
    Key,
    expiresIn = 120,
    donwloadName = "dummy",
    download = "false",
}: {
    Bucket?: string;
    Key: string;
    expiresIn?: number;
    donwloadName?: string;
    download?: string;
}): Promise<string> => {
    const command = new GetObjectCommand({
        Bucket,
        Key,
        ResponseContentDisposition:
            download === "true"
                ? `attachment; filename="${
                      donwloadName || Key.split("/").pop()
                  }"`
                : undefined,
    });

    const url = await getSignedUrl(s3Config(), command, { expiresIn });
    if (!url) {
        throw new BadRequestException("failed to create Presigned url");
    }
    return url;
};

export const getFile = async ({
    Bucket = process.env.AWS_BUCKET_NAME as string,
    Key,
}: {
    Bucket?: string;
    Key: string;
}): Promise<GetObjectCommandOutput> => {
    const command = new GetObjectCommand({
        Bucket,
        Key,
    });
    return await s3Config().send(command);
};

export const deleteFile = async ({
    Bucket = process.env.AWS_BUCKET_NAME as string,
    Key,
}: {
    Bucket?: string;
    Key: string;
}): Promise<DeleteObjectCommandOutput> => {
    const command = new DeleteObjectCommand({
        Bucket,
        Key,
    });
    return await s3Config().send(command);
};

export const deleteFiles = async ({
    Bucket = process.env.AWS_BUCKET_NAME as string,
    urls,
    Quiet = false,
}: {
    Bucket?: string;
    urls: string[];
    Quiet?: boolean;
}): Promise<DeleteObjectsCommandOutput> => {
    const Objects = urls.map((url) => {
        return { Key: url };
    });

    const command = new DeleteObjectsCommand({
        Bucket,
        Delete: {
            Objects: Objects,
            Quiet,
        },
    });
    return await s3Config().send(command);
};

export const listDirectoryFiles = async ({
    Bucket = process.env.AWS_BUCKET_NAME as string,
    path,
}: {
    Bucket?: string;
    path: string;
}) => {
    const command = new ListObjectsV2Command({
        Bucket,
        Prefix: `${process.env.APPLICATION_NAME}/${path}`,
    });

    return await s3Config().send(command);
};
export const deleteFolderByPrefix = async ({
    Bucket = process.env.AWS_BUCKET_NAME as string,
    path,
    Quiet = false,
}: {
    Bucket?: string;
    path: string;
    Quiet?: boolean;
}): Promise<DeleteObjectsCommandOutput> => {
    const fileList = await listDirectoryFiles({ Bucket, path });
    if (!fileList?.Contents?.length) {
        throw new BadRequestException("empty directory");
    }
    const urls: string[] = fileList.Contents.map((file) => {
        return file.Key as string;
    });
    return await deleteFiles({ urls, Bucket, Quiet });
};
