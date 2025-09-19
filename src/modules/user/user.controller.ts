import { Router } from "express";
import { authentication, authorization } from "../../middleware/authentication.middleware";
import userService from "./user.service";
import { validation } from "../../middleware/validation.middleware";
import * as validators from "./user.validation";
import { TokenEnum } from "../../utils/security/token.security";
import {
    cloudFileUpload,
    fileValidation,
    StorageEnum,
} from "../../utils/multer/cloud.multer";
import { endpoint } from "./user.authorization";
const router = Router();

router.get("/", authentication(), userService.profile);
router.get("/dashboard", authorization(endpoint.dashboard), userService.dashboard);

router.patch("/profile-image", authentication(), userService.profileImage);

router.patch(
    "/profile-cover-image",
    authentication(),
    cloudFileUpload({
        validation: fileValidation.image,
        storageApproach: StorageEnum.disk,
    }).array("images", 2),
    userService.profileCoverImage
);

router.patch(
    "/update-basic-info",
    authentication(),
    validation(validators.updateBasicInfo),
    userService.updateBasicInfo
);
router.delete(
    "{/:userId}/freeze-account",
    authentication(),
    validation(validators.freezeAccount),
    userService.freezeAccount
);
router.delete(
    "/:userId",
    authorization(endpoint.hardDelete),
    validation(validators.hardDelete),
    userService.hardDelete
);

router.post(
    "/refresh-token",
    authentication(TokenEnum.refresh),
    userService.refreshToken
);

router.post(
    "/logout",
    authentication(),
    validation(validators.logout),
    userService.logout
);

router.patch(
    "/update-password",
    authentication(),
    validation(validators.updatePassword),
    userService.updatePassword
);

router.patch(
    "/update-email",
    authentication(),
    validation(validators.updateEmail),
    userService.updateEmail
);

router.post(
    "/send-email",
    authentication(),
    validation(validators.sendEmailWithTags),
    userService.sendEmailWithTags
);

router.post(
    "/enable-2fa",
    authentication(),
    validation(validators.enableTwoFactor),
    userService.enableTwoFactor
);

router.post(
    "/verify-2fa",
    authentication(),
    validation(validators.verifyTwoFactor),
    userService.verifyTwoFactor
);

router.post(
    "/disable-2fa",
    authentication(),
    validation(validators.disableTwoFactor),
    userService.disableTwoFactor
);

export default router;
