import { EventEmitter } from "node:events";
import { deleteFile, getFile } from "./s3.config";
import { UserRepository } from "../../DB/repository/user.repository";
import { UserModel } from "../../DB/models/User.model";

export const s3Event = new EventEmitter();

s3Event.on("trackFileUpload", (data) => {
    setTimeout(async () => {
        const userModel = await new UserRepository(UserModel);
        try {
            await getFile({ Key: data.key });
            await userModel.updateOne({
                filter: { _id: data.userId },
                update: { $unset: { tempProfileImage: 1 } },
            });
            await deleteFile({ Key: data.oldKey });
            console.log("Done ✅");
        } catch (error: any) {
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
