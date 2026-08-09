'use client';

import { Button, Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@riznexia/ui';
import { Menu } from 'lucide-react';
import { useState } from 'react';
import { SidebarNav } from './sidebar-nav';

// `<lg` viewports: the sidebar collapses into this Sheet (docs/17 §6's
// Drawer component), triggered from the Header — the pragmatic,
// still-first-class-functional stand-in for a permanently-visible icon
// rail (frontend architecture review §14/§15's desktop-first, mobile
// "functional not optimized" scope call). Takes no `role` prop — see
// `sidebar.tsx`.
export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-72 flex-col">
        <SheetHeader>
          <SheetTitle>Riznexia</SheetTitle>
        </SheetHeader>
        <div className="mt-2 flex-1 overflow-y-auto">
          <SidebarNav onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
