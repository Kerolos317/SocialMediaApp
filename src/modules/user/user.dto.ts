import { z } from "zod";
import { logout } from "./user.validation";




export type ILogoutDTO = z.infer<typeof logout.body>;