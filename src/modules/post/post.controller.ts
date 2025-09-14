import { Router } from "express";
import { authentication } from "../../middleware/authentication.middleware";
import postService from "./post.service";
import * as validators from "./post.validation";
import {
    cloudFileUpload,
    fileValidation,
} from "../../utils/multer/cloud.multer";
import { validation } from "../../middleware/validation.middleware";

const router = Router();

router.patch(
    "/:postId",
    authentication(),
    validation(validators.likePost),
    postService.likePost
);
router.post(
    "/create-post",
    authentication(),
    cloudFileUpload({ validation: fileValidation.image }).array(
        "attachments",
        2
    ),
    validation(validators.createPost),
    postService.createPost
);
export default router;
