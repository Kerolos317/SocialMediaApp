"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentModel = void 0;
const mongoose_1 = require("mongoose");
const commentSchema = new mongoose_1.Schema({
    content: {
        type: String,
        minlength: 2,
        maxlength: 500000,
        required: function () {
            return !this.attachments?.length;
        },
    },
    attachments: { type: [String] },
    likes: { type: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User" }] },
    tags: { type: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User" }] },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: "User" },
    postId: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: "Post" },
    commentId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Comment" },
    freezedAt: { type: Date },
    freezedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    restoredAt: { type: Date },
    restoredBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true, strictQuery: true });
commentSchema.pre(["findOneAndUpdate", "updateOne"], function (next) {
    const query = this.getQuery();
    if (query.paranoid === false) {
        this.setQuery({ ...query });
    }
    else {
        this.setQuery({ ...query, freezedAt: { $exists: false } });
    }
    next();
});
commentSchema.pre(["find", "findOne", "countDocuments"], function (next) {
    const query = this.getQuery();
    if (query.paranoid === false) {
        this.setQuery({ ...query });
    }
    else {
        this.setQuery({ ...query, freezedAt: { $exists: false } });
    }
    next();
});
exports.CommentModel = mongoose_1.models.Comment || (0, mongoose_1.model)("Comment", commentSchema);
