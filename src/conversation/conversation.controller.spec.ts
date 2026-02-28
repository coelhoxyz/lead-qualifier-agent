import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConversationController } from './conversation.controller';
import { ConversationService } from './conversation.service';

const mockService = {
  sendMessage: jest.fn(),
  getStatus: jest.fn(),
};

let controller: ConversationController;

beforeEach(async () => {
  jest.clearAllMocks();

  const module = await Test.createTestingModule({
    controllers: [ConversationController],
    providers: [{ provide: ConversationService, useValue: mockService }],
  }).compile();

  controller = module.get(ConversationController);
});

describe('ConversationController', () => {
  it('POST delegates to sendMessage with phoneNumber and content', async () => {
    const expected = { type: 'text', content: 'Olá!' };
    mockService.sendMessage.mockResolvedValue(expected);

    const result = await controller.sendMessage('+5511999999999', {
      content: 'Oi',
    });

    expect(mockService.sendMessage).toHaveBeenCalledWith(
      '+5511999999999',
      'Oi',
    );
    expect(result).toEqual(expected);
  });

  it('GET returns status object', async () => {
    const status = {
      phoneNumber: '+5511999999999',
      status: 'active',
      funnelStep: 'collect_name',
      variables: {},
    };
    mockService.getStatus.mockResolvedValue(status);

    const result = await controller.getStatus('+5511999999999');

    expect(result).toEqual(status);
  });

  it('GET throws NotFoundException when status is null', async () => {
    mockService.getStatus.mockResolvedValue(null);

    await expect(controller.getStatus('+5511999999999')).rejects.toThrow(
      NotFoundException,
    );
  });
});
