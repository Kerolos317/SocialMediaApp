import multer, { FileFilterCallback } from "multer";
import { BadRequestException } from "../response/error.response";
import { Request } from "express";
import os from "os";
import {v4 as uuid } from "uuid";

export enum StorageEnum {
    memory = "memory",
    disk = "disk",
}

export const fileValidation = {
    image: ["image/jpg", "image/jpeg", "image/png", "image/gif", "image/webp"],
    video: [
        "video/mp4",
        "video/mkv",
        "video/avi",
        "video/mov",
        "video/wmv",
        "video/flv",
        "video/webm",
    ],
    audio: [
        "audio/mpeg",
        "audio/wav",
        "audio/ogg",
        "audio/aac",
        "audio/flac",
        "audio/webm",
    ],
    document: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain",
    ],
};

export const cloudFileUpload = ({
    validation = [],
    storageApproach = StorageEnum.memory,
    maxSizeMB = 2,
}: {
    validation?: string[];
    storageApproach?: StorageEnum;
    maxSizeMB?: number;
}): multer.Multer => {
    const storage =
        storageApproach === StorageEnum.memory
            ? multer.memoryStorage()
            : multer.diskStorage({
                  destination: os.tmpdir(),
                  filename:function (req: Request, file: Express.Multer.File, callback) {
                    callback(null,`${uuid()}.${file.originalname}`);
                  }
              });
    function fileFilter(
        req: Request,
        file: Express.Multer.File,
        callback: FileFilterCallback
    ) {
        if (!validation.includes(file.mimetype)) {
            return callback(new BadRequestException("validation error", {
                validationError: [
                    {
                        key: "file",
                        issues: [
                            { path: "file", message: "Invalid file format" },
                        ],
                    },
                ],
            }), );
        }
        callback(null, true);
    }
    return multer({ storage, limits: { fileSize: maxSizeMB * 1024 * 1024 }, fileFilter });
};
