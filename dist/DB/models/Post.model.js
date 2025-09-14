"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostModel = exports.AvailabilityEnum = exports.AllowCommentsEnum = void 0;
const mongoose_1 = require("mongoose");
var AllowCommentsEnum;
(function (AllowCommentsEnum) {
    AllowCommentsEnum["allow"] = "allow";
    AllowCommentsEnum["deny"] = "deny";
})(AllowCommentsEnum || (exports.AllowCommentsEnum = AllowCommentsEnum = {}));
var AvailabilityEnum;
(function (AvailabilityEnum) {
    AvailabilityEnum["public"] = "public";
    AvailabilityEnum["friends"] = "friends";
    AvailabilityEnum["onlyMe"] = "only-me";
})(AvailabilityEnum || (exports.AvailabilityEnum = AvailabilityEnum = {}));
const postSchema = new mongoose_1.Schema({
    content: {
        type: String,
        minlength: 2,
        maxlength: 500000,
        required: function () {
            return !this.attachment?.length;
        },
    },
    attachment: { type: [String] },
    assetsFolderId: { type: String, required: true },
    availability: {
        type: String,
        enum: AvailabilityEnum,
        default: AvailabilityEnum.public,
    },
    allowComments: {
        type: String,
        enum: AllowCommentsEnum,
        default: AllowCommentsEnum.allow,
    },
    likes: { type: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User" }] },
    tags: { type: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User" }] },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: "User" },
    freezedAt: { type: Date },
    freezedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    restoredAt: { type: Date },
    restoredBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });
exports.PostModel = mongoose_1.models.Post || (0, mongoose_1.model)("Post", postSchema);
