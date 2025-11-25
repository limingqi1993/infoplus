import React from 'react';
import { Home, Plus, User, Clock, Trash2, RefreshCw, ExternalLink, Globe } from 'lucide-react';

export const FeedIcon = ({ className }: { className?: string }) => <Home className={className} />;
export const AddIcon = ({ className }: { className?: string }) => <Plus className={className} />;
export const MineIcon = ({ className }: { className?: string }) => <User className={className} />;
export const ClockIcon = ({ className }: { className?: string }) => <Clock className={className} />;
export const TrashIcon = ({ className }: { className?: string }) => <Trash2 className={className} />;
export const RefreshIcon = ({ className }: { className?: string }) => <RefreshCw className={className} />;
export const LinkIcon = ({ className }: { className?: string }) => <ExternalLink className={className} />;
export const GlobeIcon = ({ className }: { className?: string }) => <Globe className={className} />;