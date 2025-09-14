import { z } from "zod";
import { 
    logout, 
    updatePassword, 
    updateEmail, 
    sendEmailWithTags, 
    enableTwoFactor, 
    verifyTwoFactor, 
    disableTwoFactor 
} from "./user.validation";

export type ILogoutDTO = z.infer<typeof logout.body>;
export type IUpdatePasswordDTO = z.infer<typeof updatePassword.body>;
export type IUpdateEmailDTO = z.infer<typeof updateEmail.body>;
export type ISendEmailWithTagsDTO = z.infer<typeof sendEmailWithTags.body>;
export type IEnableTwoFactorDTO = z.infer<typeof enableTwoFactor.body>;
export type IVerifyTwoFactorDTO = z.infer<typeof verifyTwoFactor.body>;
export type IDisableTwoFactorDTO = z.infer<typeof disableTwoFactor.body>;