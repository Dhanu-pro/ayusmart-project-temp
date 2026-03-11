import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AdminService {
  constructor(private readonly configService: ConfigService) {}

  login(username?: string, password?: string) {
    const configuredUsername = this.configService.get<string>("ADMIN_USERNAME", "admin");
    const configuredPassword = this.configService.get<string>("ADMIN_PASSWORD", "admin123");

    if (
      !username ||
      !password ||
      username.trim() !== configuredUsername ||
      password !== configuredPassword
    ) {
      throw new UnauthorizedException("Invalid user name or password");
    }

    return { RESPONSE: "SUCCESS" };
  }
}
