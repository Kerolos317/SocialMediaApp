import { Router } from "express";
import { authentication } from "../../middleware/authentication.middleware";
import commentService from "./comment.service";
import {
    cloudFileUpload,
    fileValidation,
} from "../../utils/multer/cloud.multer";
import { validation } from "../../middleware/validation.middleware";
import * as validators from "./comment.validation";


const router = Router({mergeParams:true});

router.post(
    "/",
    authentication(),
    cloudFileUpload({ validation: fileValidation.image }).array(
        "attachments",
        2
    ),
    validation(validators.createComment),
    commentService.createComment
);
router.post(
    "/:commentId/reply",
    authentication(),
    cloudFileUpload({ validation: fileValidation.image }).array(
        "attachments",
        2
    ),
    validation(validators.updateComment),
    commentService.replyOnComment
);

export default router;
