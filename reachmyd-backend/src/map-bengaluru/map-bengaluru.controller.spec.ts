import { Test, TestingModule } from '@nestjs/testing';
import { MapBengaluruController } from './map-bengaluru.controller';

describe('MapBengaluruController', () => {
  let controller: MapBengaluruController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MapBengaluruController],
    }).compile();

    controller = module.get<MapBengaluruController>(MapBengaluruController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
