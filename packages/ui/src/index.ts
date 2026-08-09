// Shared dashboard component library, shadcn/ui-based (Doc 17 §6). Module
// F1 (Foundation) populated the first slice — generic, app-agnostic
// primitives plus the RHF/Zod form wiring and the Toaster/ErrorState seams
// every future feature module builds screens on. The shared DataTable
// (post-F2 improvement) is generic over any row type, no business-specific
// logic — every future module's own tables are meant to reuse it rather
// than building a new one. StatusBadge (post-F2, first used by F3) is
// generic the same way — five semantic tones, no domain knowledge of what
// "queued" or "completed" means; a consuming feature supplies its own
// mapping. AlertDialog and Textarea (post-F3, first used by F4) are
// generic primitives — a destructive-confirmation modal and a multi-line
// text input, no knowledge of what they're confirming/collecting. Tabs and
// Card (post-F8, first used by F9) are generic the same way — a labeled
// panel switcher and a plain section container, no knowledge of what
// they're switching between or containing. Dialog (post-F9, first used by
// F10) is a centered modal built on the same Radix Dialog primitive as
// Sheet, but visually/behaviorally distinct — Sheet is a full-height side
// drawer, Dialog is a width-capped centered form/confirmation surface.
// PipelineStepper/KanbanCard remain reserved for their own first
// consuming screen module.
export { cn } from './lib/utils';

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './components/alert-dialog';
export { Avatar, AvatarFallback, AvatarImage } from './components/avatar';
export { Button, buttonVariants, type ButtonProps } from './components/button';
export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './components/card';
export { Checkbox } from './components/checkbox';
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from './components/dialog';
export {
  DataTable,
  DataTableColumnHeader,
  type ColumnDef,
  type DataTableBulkAction,
  type DataTableColumnMeta,
  type DataTablePaginationConfig,
  type DataTableProps,
  type DataTableSortingConfig,
  type SortingState,
} from './components/data-table';
export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './components/dropdown-menu';
export { ErrorState, type ApiErrorLike, type ErrorStateProps } from './components/error-state';
export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './components/form';
export { Input } from './components/input';
export { Label } from './components/label';
export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
  type SheetContentProps,
} from './components/sheet';
export { Separator } from './components/separator';
export { Skeleton } from './components/skeleton';
export { StatusBadge, statusBadgeVariants, type StatusBadgeProps } from './components/status-badge';
export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/table';
export { Tabs, TabsContent, TabsList, TabsTrigger } from './components/tabs';
export { Textarea } from './components/textarea';
export { toast, Toaster, type ToasterProps } from './components/toaster';
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './components/tooltip';
