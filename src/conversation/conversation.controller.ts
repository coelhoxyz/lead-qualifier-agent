import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  NotFoundException,
} from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('conversations')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post(':phoneNumber/messages')
  async sendMessage(
    @Param('phoneNumber') phoneNumber: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.conversationService.sendMessage(phoneNumber, dto.content);
  }

  @Get(':phoneNumber/status')
  async getStatus(@Param('phoneNumber') phoneNumber: string) {
    const status = await this.conversationService.getStatus(phoneNumber);
    if (!status) {
      throw new NotFoundException('Conversation not found');
    }
    return status;
  }
}
