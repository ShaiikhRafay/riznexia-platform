import { Controller, Get, NotFoundException } from '@nestjs/common';
import type { TeamMember } from '@riznexia/shared-types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { toTeamMemberResponse } from './dto/team-member-response.dto';
import { TeamMemberService } from './team-member.service';
import type { RequestTeamMember } from './types/authenticated-request';

// GET /me — docs/19-api-architecture.md §3. The frontend's source of truth
// for "who am I / what can I see" (role-gated nav, Doc 17 §7).
@Controller('me')
export class MeController {
  constructor(private readonly teamMemberService: TeamMemberService) {}

  @Get()
  async getCurrentUser(@CurrentUser() user: RequestTeamMember): Promise<TeamMember> {
    const member = await this.teamMemberService.findById(user.id);
    if (!member) {
      // Guard already confirmed this row existed for this request; a miss
      // here would mean it was deleted mid-request — treat as not found
      // rather than surfacing a confusing 401 for an already-authenticated call.
      throw new NotFoundException('Team member not found');
    }
    return toTeamMemberResponse(member);
  }
}
