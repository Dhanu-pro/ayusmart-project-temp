import { Test, TestingModule } from '@nestjs/testing';
import { MapBengaluruService } from './map-bengaluru.service';

describe('MapBengaluruService', () => {
  let service: MapBengaluruService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MapBengaluruService],
    }).compile();

    service = module.get<MapBengaluruService>(MapBengaluruService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
