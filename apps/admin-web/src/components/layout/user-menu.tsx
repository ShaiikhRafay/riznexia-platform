'use client';

import { useClerk } from '@clerk/nextjs';
import type { TeamMember } from '@riznexia/shared-types';
import {
  Avatar,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@riznexia/ui';
import { LogOut, User } from 'lucide-react';
import Link from 'next/link';

export interface UserMenuProps {
  currentUser: TeamMember;
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return `${first}${last}`.toUpperCase() || '?';
}

// docs/17 §7 — user menu: profile, theme toggle (lives in Header directly,
// always visible per §16 rather than nested here), sign out.
export function UserMenu({ currentUser }: UserMenuProps) {
  const { signOut } = useClerk();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus-visible:ring-(--color-accent) rounded-full focus-visible:outline-none focus-visible:ring-2">
        <Avatar>
          <AvatarFallback>{initialsFor(currentUser.name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-0.5">
            <span className="text-(--color-text-primary) text-sm font-medium">
              {currentUser.name}
            </span>
            <span className="text-(--color-text-secondary) text-xs font-normal">
              {currentUser.email}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile" className="flex w-full items-center gap-2">
            <User className="h-4 w-4" aria-hidden="true" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => void signOut({ redirectUrl: '/sign-in' })}
          className="text-(--color-danger) gap-2"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
