import { Body, Controller, Post } from "@nestjs/common";
import { AdminService } from "./admin.service";

type AdminLoginBody = {
  username?: string;
  password?: string;
};

@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post("login")
  login(@Body() body: AdminLoginBody) {
    return this.adminService.login(body.username, body.password);
  }
}
