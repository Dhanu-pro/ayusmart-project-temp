import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MapModule } from "./map/map.module";
import { DoctorModule } from "./doctor/doctor.module";
import { AdminModule } from "./admin/admin.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: "mysql",
        host: configService.get<string>("DB_HOST", "localhost"),
        port: parseInt(configService.get<string>("DB_PORT", "3306"), 10),
        username: configService.get<string>("DB_USER", "root"),
        password: configService.get<string>("DB_PASSWORD", ""),
        database: configService.get<string>("DB_NAME", "reachmyd_mapdata"),
        synchronize: false,
      }),
    }),
    MapModule,
    DoctorModule,
    AdminModule,
  ],
})
export class AppModule {}
