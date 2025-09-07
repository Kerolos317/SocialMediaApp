"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFolderByPrefix = exports.listDirectoryFiles = exports.deleteFiles = exports.deleteFile = exports.getFile = exports.createGetPreSignedLink = exports.createPreSignedUploadLink = exports.uploadLargeFile = exports.uploadFiles = exports.uploadFile = exports.s3Config = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const uuid_1 = require("uuid");
const cloud_multer_1 = require("./cloud.multer");
const fs_1 = require("fs");
const error_response_1 = require("../response/error.response");
const lib_storage_1 = require("@aws-sdk/lib-storage");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const s3Config = () => {
    return new client_s3_1.S3Client({
        region: process.env.AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
    });
};
exports.s3Config = s3Config;
const uploadFile = async ({ storageApproach = cloud_multer_1.StorageEnum.memory, Bucket = process.env.AWS_BUCKET_NAME, ACL = "private", path = "general", file, }) => {
    const command = new client_s3_1.PutObjectCommand({
        Bucket,
        ACL,
        Key: `${process.env.APPLICATION_NAME}/${path}/${(0, uuid_1.v4)()}_${file.originalname}`,
        Body: storageApproach === cloud_multer_1.StorageEnum.memory
            ? file.buffer
            : (0, fs_1.createReadStream)(file.path),
        ContentType: file.mimetype,
    });
    await (0, exports.s3Config)().send(command);
    if (!command.input.Key) {
        throw new error_response_1.BadRequestException("File upload failed");
    }
    return command.input.Key;
};
exports.uploadFile = uploadFile;
const uploadFiles = async ({ files, storageApproach = cloud_multer_1.StorageEnum.memory, path = "general", Bucket = process.env.AWS_BUCKET_NAME, ACL = "private", useLarge = false, }) => {
    if (useLarge) {
        const urls = await Promise.all(files.map((file) => (0, exports.uploadLargeFile)({ storageApproach, Bucket, ACL, path, file })));
        return urls;
    }
    else {
        const urls = await Promise.all(files.map((file) => (0, exports.uploadFile)({ storageApproach, Bucket, ACL, path, file })));
        return urls;
    }
};
exports.uploadFiles = uploadFiles;
const uploadLargeFile = async ({ storageApproach = cloud_multer_1.StorageEnum.memory, Bucket = process.env.AWS_BUCKET_NAME, path = "general", ACL = "private", file, }) => {
    const upload = new lib_storage_1.Upload({
        client: (0, exports.s3Config)(),
        params: {
            Bucket,
            Key: `${process.env.APPLICATION_NAME}/${path}/${Date.now()}__${Math.random()}_250/${file.originalname}`,
            ACL,
            Body: storageApproach === cloud_multer_1.StorageEnum.memory
                ? file.buffer
                : (0, fs_1.createReadStream)(file.path),
            ContentType: file.mimetype,
        },
    });
    upload.on("httpUploadProgress", (progress) => {
        console.log(`File upload progress is ::: `, progress);
    });
    const { Key } = await upload.done();
    if (!Key) {
        throw new error_response_1.BadRequestException("File upload failed");
    }
    return Key;
};
exports.uploadLargeFile = uploadLargeFile;
const createPreSignedUploadLink = async ({ Bucket = process.env.AWS_BUCKET_NAME, path = "general", expiresIn = 120, ContentType, originalname, }) => {
    const command = new client_s3_1.PutObjectCommand({
        Bucket,
        Key: `${process.env.APPLICATION_NAME}/${path}/${(0, uuid_1.v4)()}_${originalname}`,
        ContentType,
    });
    const url = await (0, s3_request_presigner_1.getSignedUrl)((0, exports.s3Config)(), command, { expiresIn });
    if (!url || !command.input.Key) {
        throw new error_response_1.BadRequestException("failed to create Presigned url");
    }
    return { url, key: command.input.Key };
};
exports.createPreSignedUploadLink = createPreSignedUploadLink;
const createGetPreSignedLink = async ({ Bucket = process.env.AWS_BUCKET_NAME, Key, expiresIn = 120, donwloadName = "dummy", download = "false", }) => {
    const command = new client_s3_1.GetObjectCommand({
        Bucket,
        Key,
        ResponseContentDisposition: download === "true"
            ? `attachment; filename="${donwloadName || Key.split("/").pop()}"`
            : undefined,
    });
    const url = await (0, s3_request_presigner_1.getSignedUrl)((0, exports.s3Config)(), command, { expiresIn });
    if (!url) {
        throw new error_response_1.BadRequestException("failed to create Presigned url");
    }
    return url;
};
exports.createGetPreSignedLink = createGetPreSignedLink;
const getFile = async ({ Bucket = process.env.AWS_BUCKET_NAME, Key, }) => {
    const command = new client_s3_1.GetObjectCommand({
        Bucket,
        Key,
    });
    return await (0, exports.s3Config)().send(command);
};
exports.getFile = getFile;
const deleteFile = async ({ Bucket = process.env.AWS_BUCKET_NAME, Key, }) => {
    const command = new client_s3_1.DeleteObjectCommand({
        Bucket,
        Key,
    });
    return await (0, exports.s3Config)().send(command);
};
exports.deleteFile = deleteFile;
const deleteFiles = async ({ Bucket = process.env.AWS_BUCKET_NAME, urls, Quiet = false, }) => {
    const Objects = urls.map((url) => {
        return { Key: url };
    });
    const command = new client_s3_1.DeleteObjectsCommand({
        Bucket,
        Delete: {
            Objects: Objects,
            Quiet,
        },
    });
    return await (0, exports.s3Config)().send(command);
};
exports.deleteFiles = deleteFiles;
const listDirectoryFiles = async ({ Bucket = process.env.AWS_BUCKET_NAME, path, }) => {
    const command = new client_s3_1.ListObjectsV2Command({
        Bucket,
        Prefix: `${process.env.APPLICATION_NAME}/${path}`,
    });
    return await (0, exports.s3Config)().send(command);
};
exports.listDirectoryFiles = listDirectoryFiles;
const deleteFolderByPrefix = async ({ Bucket = process.env.AWS_BUCKET_NAME, path, Quiet = false, }) => {
    const fileList = await (0, exports.listDirectoryFiles)({ Bucket, path });
    if (!fileList?.Contents?.length) {
        throw new error_response_1.BadRequestException("empty directory");
    }
    const urls = fileList.Contents.map((file) => {
        return file.Key;
    });
    return await (0, exports.deleteFiles)({ urls, Bucket, Quiet });
};
exports.deleteFolderByPrefix = deleteFolderByPrefix;
