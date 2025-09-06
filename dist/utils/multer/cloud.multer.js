"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloudFileUpload = exports.fileValidation = exports.StorageEnum = void 0;
const multer_1 = __importDefault(require("multer"));
const error_response_1 = require("../response/error.response");
const os_1 = __importDefault(require("os"));
const uuid_1 = require("uuid");
var StorageEnum;
(function (StorageEnum) {
    StorageEnum["memory"] = "memory";
    StorageEnum["disk"] = "disk";
})(StorageEnum || (exports.StorageEnum = StorageEnum = {}));
exports.fileValidation = {
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
const cloudFileUpload = ({ validation = [], storageApproach = StorageEnum.memory, maxSizeMB = 2, }) => {
    const storage = storageApproach === StorageEnum.memory
        ? multer_1.default.memoryStorage()
        : multer_1.default.diskStorage({
            destination: os_1.default.tmpdir(),
            filename: function (req, file, callback) {
                callback(null, `${(0, uuid_1.v4)()}.${file.originalname}`);
            }
        });
    function fileFilter(req, file, callback) {
        if (!validation.includes(file.mimetype)) {
            return callback(new error_response_1.BadRequestException("validation error", {
                validationError: [
                    {
                        key: "file",
                        issues: [
                            { path: "file", message: "Invalid file format" },
                        ],
                    },
                ],
            }));
        }
        callback(null, true);
    }
    return (0, multer_1.default)({ storage, limits: { fileSize: maxSizeMB * 1024 * 1024 }, fileFilter });
};
exports.cloudFileUpload = cloudFileUpload;
