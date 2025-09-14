import { resolve } from "node:path";
import { config } from "dotenv";
config({ path: resolve("./config/.env.development") });

import express from "express";
import type { Response, Request, Express } from "express";
import connectDB from "./DB/connection.db";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";

import { authRouter, postRouter, userRouter } from "./modules";
import {
    BadRequestException,
    globalErrorHandling,
} from "./utils/response/error.response";
import {
    createGetPreSignedLink,
    // deleteFile,
    // deleteFiles,
    getFile,
    // listDirectoryFiles,
} from "./utils/multer/s3.config";
import { promisify } from "node:util";
import { pipeline } from "node:stream";
const writeS3WriteStreamPipe = promisify(pipeline);

const bootstrap = async (): Promise<void> => {
    const app: Express = express();
    const port: number | string = process.env.PORT || 5000;

    //DB
    await connectDB();

    const limiter = rateLimit({
        windowMs: 60 * 60000,
        limit: 2000,
        message: { error: "Too many request please try again later" },
        statusCode: 429,
    });

    app.use(cors(), limiter, helmet(), express.json());

    //app-routing
    app.get("/", (req: Request, res: Response) => {
        res.json({
            message: `welcome to ${process.env.APPLICATION_NAME} landing page`,
        });
    });

    //sub-app-routing-modules
    app.use("/auth", authRouter);
    app.use("/user", userRouter);
    app.use("/post", postRouter);

    //test-s3
    // app.get("/test", async (req: Request, res: Response) => {
    //     // const { Key } = req.query as { Key: string };
    //     // const result = await deleteFile({ Key });

    //     // const result = await deleteFiles({
    //     //     urls: [""],
    //     //     Quiet: true,
    //     // });

    //     await deleteFolderByPrefix({ path: `users/` });
    //     return res.json({ message: "Done" });
    // });

    //get=asset
    app.get(
        "/upload/pre-signed/*path",
        async (req: Request, res: Response): Promise<Response> => {
            const {
                donwloadName,
                download = "false",
                expiresIn = 120,
            } = req.query as {
                donwloadName?: string;
                download?: string;
                expiresIn?: number;
            };
            const { path } = req.params as unknown as { path: string[] };
            const Key = path.join("/");
            const url = await createGetPreSignedLink({
                Key,
                donwloadName: donwloadName as string,
                download,
                expiresIn,
            });
            return res.json({ message: "Done", data: { url } });
        }
    );

    app.get(
        "/upload/*path",
        async (req: Request, res: Response): Promise<void> => {
            const { donwloadName, download = "false" } = req.query as {
                donwloadName?: string;
                download?: string;
            };
            const { path } = req.params as unknown as { path: string[] };
            const Key = path.join("/");
            const s3Response = await getFile({ Key });
            if (!s3Response?.Body) {
                throw new BadRequestException("fail to fetch this asset");
            }
            res.setHeader(
                "Content-Type",
                `${s3Response.ContentType || "application/octet-stream"}`
            );
            if (download === "true") {
                res.setHeader(
                    "Content-Disposition",
                    `attachment; filename="${
                        donwloadName || Key.split("/").pop()
                    }"`
                );
            }
            return await writeS3WriteStreamPipe(
                s3Response.Body as NodeJS.ReadableStream,
                res
            );
        }
    );

    //In-valid routing
    app.use("{/*dummy}", (req: Request, res: Response) => {
        res.status(404).json({ message: "In-valid routing" });
    });

    // global-error-handling
    app.use(globalErrorHandling);

    //Hooks
    // async function test() {
    //     try {
    //         const user = new UserModel({
    //             username: "kerolos tamer",
    //             email: `${Date.now()}@gmail.com`,
    //             password: "123455",
    //         });
    //         await user.save();
    //     } catch (error) {
    //       console.log(error);
    //     }
    // }
    // test();

    app.listen(3000, () => {
        console.log(`Server is running :::${port} 🚀 `);
    });
};

export default bootstrap;
