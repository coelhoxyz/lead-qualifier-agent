import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AgentService } from '../agent/agent.service';
import { Conversation, FunnelStep, Status } from '@prisma/client';
import { ChatMessage } from '../agent/graph/state';

const SESSION_TIMEOUT_MS = 15 * 60 * 1000;

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly agent: AgentService,
  ) {}

  async sendMessage(
    phoneNumber: string,
    content: string,
  ): Promise<{
    type: 'text';
    content: string;
    conversation: {
      phoneNumber: string;
      status: string;
      funnelStep: string;
      variables: {
        name?: string;
        birthDate?: string;
        weightLossReason?: string;
      };
    };
  }> {
    let conversation = await this.findActiveConversation(phoneNumber);

    if (conversation && this.isExpired(conversation)) {
      await this.expireConversation(conversation.id);
      conversation = null;
    }

    if (!conversation) {
      conversation = await this.createConversation(phoneNumber);
    }

    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content,
      },
    });

    const messages = await this.getMessages(conversation.id);
    const chatMessages: ChatMessage[] = messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const result = await this.agent.processMessage(
      phoneNumber,
      chatMessages,
      {
        name: conversation.name ?? undefined,
        birthDate: conversation.birthDate?.toISOString().split('T')[0],
        weightLossReason: conversation.weightLossReason ?? undefined,
        qualified: conversation.qualified ?? undefined,
        funnelStep: conversation.funnelStep,
      },
    );

    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: result.responseMessage,
      },
    });

    const status = this.mapFunnelStepToStatus(result.funnelStep);

    conversation = await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        name: result.name,
        birthDate: result.birthDate ? new Date(result.birthDate) : undefined,
        weightLossReason: result.weightLossReason,
        qualified: result.qualified,
        funnelStep: result.funnelStep as FunnelStep,
        status,
        lastActivity: new Date(),
        finishedAt:
          status === Status.qualified || status === Status.rejected
            ? new Date()
            : undefined,
      },
    });

    return {
      type: 'text',
      content: result.responseMessage,
      conversation: {
        phoneNumber: conversation.phoneNumber,
        status: conversation.status,
        funnelStep: conversation.funnelStep,
        variables: {
          name: conversation.name ?? undefined,
          birthDate: conversation.birthDate
            ?.toISOString()
            .split('T')[0],
          weightLossReason: conversation.weightLossReason ?? undefined,
        },
      },
    };
  }

  async getStatus(phoneNumber: string): Promise<{
    phoneNumber: string;
    status: string;
    funnelStep: string;
    variables: {
      name?: string;
      birthDate?: string;
      weightLossReason?: string;
    };
  } | null> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { phoneNumber },
    });

    if (!conversation) return null;

    return {
      phoneNumber: conversation.phoneNumber,
      status: conversation.status,
      funnelStep: conversation.funnelStep,
      variables: {
        name: conversation.name ?? undefined,
        birthDate: conversation.birthDate
          ?.toISOString()
          .split('T')[0],
        weightLossReason: conversation.weightLossReason ?? undefined,
      },
    };
  }

  private async findActiveConversation(
    phoneNumber: string,
  ): Promise<Conversation | null> {
    return this.prisma.conversation.findUnique({
      where: { phoneNumber, status: Status.active },
    });
  }

  private isExpired(conversation: Conversation): boolean {
    const elapsed = Date.now() - conversation.lastActivity.getTime();
    return elapsed > SESSION_TIMEOUT_MS;
  }

  private async expireConversation(id: string): Promise<void> {
    await this.prisma.conversation.update({
      where: { id },
      data: { status: Status.expired, finishedAt: new Date() },
    });
    this.logger.log(`Conversation ${id} expired`);
  }

  private async createConversation(
    phoneNumber: string,
  ): Promise<Conversation> {
    // Delete existing conversation for this phone number (if expired/finished)
    await this.prisma.conversation.deleteMany({
      where: { phoneNumber },
    });

    return this.prisma.conversation.create({
      data: { phoneNumber },
    });
  }

  private async getMessages(conversationId: string) {
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { timestamp: 'asc' },
    });
  }

  private mapFunnelStepToStatus(funnelStep: string): Status {
    if (funnelStep === 'qualified') return Status.qualified;
    if (funnelStep === 'rejected') return Status.rejected;
    return Status.active;
  }
}
