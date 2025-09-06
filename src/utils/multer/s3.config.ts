import {
    S3Client,
    PutObjectCommand,
    ObjectCannedACL,
} from "@aws-sdk/client-s3";
import { v4 as uuid } from "uuid";
import { StorageEnum } from "./cloud.multer";
import { createReadStream } from "fs";
import { BadRequestException } from "../response/error.response";
import { Upload } from "@aws-sdk/lib-storage";

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
    Bucket = process.env.S3_BUCKET_NAME as string,
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
    Bucket = process.env.S3_BUCKET_NAME as string,
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
