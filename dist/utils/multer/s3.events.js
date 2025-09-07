"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.s3Event = void 0;
const node_events_1 = require("node:events");
const s3_config_1 = require("./s3.config");
const user_repository_1 = require("../../DB/repository/user.repository");
const User_model_1 = require("../../DB/models/User.model");
exports.s3Event = new node_events_1.EventEmitter();
exports.s3Event.on("trackFileUpload", (data) => {
    setTimeout(async () => {
        const userModel = await new user_repository_1.UserRepository(User_model_1.UserModel);
        try {
            const file = await (0, s3_config_1.getFile)({ Key: data.key });
            await userModel.updateOne({
                filter: { _id: data.userId },
                update: { $unset: { tempProfileImage: 1 } },
            });
            await (0, s3_config_1.deleteFile)({ Key: data.oldKey });
            console.log("Done ✅");
        }
        catch (error) {
            console.error(error);
            if (error.Code === "NoSuchKey") {
                await userModel.updateOne({
                    filter: { _id: data.userId },
                    update: {
                        profileImage: data.oldKey,
                        $unset: { tempProfileImage: 1 },
                    },
                });
            }
        }
    }, data.expiresIn || 30000);
});
