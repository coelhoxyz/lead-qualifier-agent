import { Test } from '@nestjs/testing';
import { ConversationService } from './conversation.service';
import { PrismaService } from '../prisma/prisma.service';
import { AgentService } from '../agent/agent.service';
import { Status } from '@prisma/client';

const mockPrisma = {
  conversation: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },
  message: {
    create: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
};

const mockAgent = {
  processMessage: jest.fn(),
};

let service: ConversationService;

beforeEach(async () => {
  jest.clearAllMocks();

  const module = await Test.createTestingModule({
    providers: [
      ConversationService,
      { provide: PrismaService, useValue: mockPrisma },
      { provide: AgentService, useValue: mockAgent },
    ],
  }).compile();

  service = module.get(ConversationService);
});

const PHONE = '+5511999999999';

function makeConversation(overrides: Record<string, any> = {}) {
  return {
    id: 'conv-1',
    phoneNumber: PHONE,
    name: null,
    birthDate: null,
    weightLossReason: null,
    qualified: null,
    funnelStep: 'collect_name',
    status: Status.active,
    lastActivity: new Date(),
    finishedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function setupNewConversation() {
  mockPrisma.conversation.findUnique.mockResolvedValue(null);
  mockPrisma.conversation.findMany.mockResolvedValue([]);
  mockPrisma.conversation.create.mockResolvedValue(makeConversation());
  mockPrisma.message.findMany.mockResolvedValue([]);
  mockPrisma.message.create.mockResolvedValue({});
  mockPrisma.conversation.update.mockImplementation(({ data }) =>
    Promise.resolve(makeConversation(data)),
  );
}

describe('ConversationService', () => {
  describe('sendMessage', () => {
    it('creates a new conversation when none exists', async () => {
      setupNewConversation();
      mockAgent.processMessage.mockResolvedValue({
        responseMessage: 'Olá!',
        funnelStep: 'collect_name',
      });

      const result = await service.sendMessage(PHONE, 'Oi');

      expect(mockPrisma.conversation.create).toHaveBeenCalledWith({
        data: { phoneNumber: PHONE },
      });
      expect(result.content).toBe('Olá!');
      expect(result.type).toBe('text');
    });

    it('reuses existing active conversation that is not expired', async () => {
      const conv = makeConversation();
      mockPrisma.conversation.findUnique.mockResolvedValue(conv);
      mockPrisma.message.findMany.mockResolvedValue([]);
      mockPrisma.message.create.mockResolvedValue({});
      mockPrisma.conversation.update.mockImplementation(({ data }) =>
        Promise.resolve(makeConversation(data)),
      );
      mockAgent.processMessage.mockResolvedValue({
        responseMessage: 'Qual seu nome?',
        funnelStep: 'collect_name',
      });

      await service.sendMessage(PHONE, 'Oi');

      expect(mockPrisma.conversation.create).not.toHaveBeenCalled();
    });

    it('expires old conversation and creates new one when session timed out', async () => {
      const expired = makeConversation({
        lastActivity: new Date(Date.now() - 16 * 60 * 1000),
      });
      mockPrisma.conversation.findUnique
        .mockResolvedValueOnce(expired)
        .mockResolvedValueOnce(null);
      mockPrisma.conversation.findMany.mockResolvedValue([
        { id: expired.id },
      ]);
      mockPrisma.conversation.create.mockResolvedValue(makeConversation());
      mockPrisma.conversation.update.mockImplementation(({ data }) =>
        Promise.resolve(makeConversation(data)),
      );
      mockPrisma.message.findMany.mockResolvedValue([]);
      mockPrisma.message.create.mockResolvedValue({});
      mockPrisma.message.deleteMany.mockResolvedValue({});
      mockPrisma.conversation.deleteMany.mockResolvedValue({});
      mockAgent.processMessage.mockResolvedValue({
        responseMessage: 'Olá!',
        funnelStep: 'collect_name',
      });

      await service.sendMessage(PHONE, 'Oi');

      // Expired the old conversation
      expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: expired.id },
          data: expect.objectContaining({ status: Status.expired }),
        }),
      );
      // Created a new conversation
      expect(mockPrisma.conversation.create).toHaveBeenCalled();
    });

    it('sets status to qualified with finishedAt when funnelStep is qualified', async () => {
      setupNewConversation();
      mockAgent.processMessage.mockResolvedValue({
        responseMessage: 'Parabéns!',
        funnelStep: 'qualified',
        qualified: true,
        name: 'João',
        birthDate: '1990-01-01',
        weightLossReason: 'Saúde',
      });

      await service.sendMessage(PHONE, 'Saúde');

      const updateCall = mockPrisma.conversation.update.mock.calls[0][0];
      expect(updateCall.data.status).toBe(Status.qualified);
      expect(updateCall.data.finishedAt).toBeInstanceOf(Date);
    });

    it('sets status to rejected with finishedAt when funnelStep is rejected', async () => {
      setupNewConversation();
      mockAgent.processMessage.mockResolvedValue({
        responseMessage: 'Obrigado.',
        funnelStep: 'rejected',
        qualified: false,
      });

      await service.sendMessage(PHONE, 'Estética');

      const updateCall = mockPrisma.conversation.update.mock.calls[0][0];
      expect(updateCall.data.status).toBe(Status.rejected);
      expect(updateCall.data.finishedAt).toBeInstanceOf(Date);
    });

    it('sets status to active with no finishedAt for collect_name step', async () => {
      setupNewConversation();
      mockAgent.processMessage.mockResolvedValue({
        responseMessage: 'Qual seu nome?',
        funnelStep: 'collect_name',
      });

      await service.sendMessage(PHONE, 'Oi');

      const updateCall = mockPrisma.conversation.update.mock.calls[0][0];
      expect(updateCall.data.status).toBe(Status.active);
      expect(updateCall.data.finishedAt).toBeUndefined();
    });

    it('returns response with correct variables shape', async () => {
      setupNewConversation();
      mockPrisma.conversation.update.mockResolvedValue(
        makeConversation({
          name: 'João',
          birthDate: new Date('1990-01-01'),
          weightLossReason: 'Saúde',
          status: Status.qualified,
          funnelStep: 'qualified',
        }),
      );
      mockAgent.processMessage.mockResolvedValue({
        responseMessage: 'Parabéns!',
        funnelStep: 'qualified',
        name: 'João',
      });

      const result = await service.sendMessage(PHONE, 'Saúde');

      expect(result.conversation).toEqual({
        phoneNumber: PHONE,
        status: Status.qualified,
        funnelStep: 'qualified',
        variables: {
          name: 'João',
          birthDate: '1990-01-01',
          weightLossReason: 'Saúde',
        },
      });
    });
  });

  describe('sendMessage expiration boundary', () => {
    it('does not expire conversation at exactly 15 minutes', async () => {
      const now = 1700000000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const conv = makeConversation({
        lastActivity: new Date(now - 15 * 60 * 1000), // exactly 15 min
      });
      mockPrisma.conversation.findUnique.mockResolvedValue(conv);
      mockPrisma.message.findMany.mockResolvedValue([]);
      mockPrisma.message.create.mockResolvedValue({});
      mockPrisma.conversation.update.mockImplementation(({ data }) =>
        Promise.resolve(makeConversation(data)),
      );
      mockAgent.processMessage.mockResolvedValue({
        responseMessage: 'Olá!',
        funnelStep: 'collect_name',
      });

      await service.sendMessage(PHONE, 'Oi');

      // Should NOT have expired — reuses existing conversation
      expect(mockPrisma.conversation.create).not.toHaveBeenCalled();

      jest.restoreAllMocks();
    });
  });

  describe('getStatus', () => {
    it('returns status object when conversation exists', async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue(
        makeConversation({
          name: 'João',
          birthDate: new Date('1990-01-01'),
          status: Status.active,
          funnelStep: 'collect_birth_date',
        }),
      );

      const result = await service.getStatus(PHONE);

      expect(result).toEqual({
        phoneNumber: PHONE,
        status: Status.active,
        funnelStep: 'collect_birth_date',
        variables: {
          name: 'João',
          birthDate: '1990-01-01',
          weightLossReason: undefined,
        },
      });
    });

    it('returns null when conversation not found', async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue(null);

      const result = await service.getStatus(PHONE);

      expect(result).toBeNull();
    });
  });
});
