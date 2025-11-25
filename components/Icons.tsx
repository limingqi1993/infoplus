import React from 'react';
import { Home, Plus, User, Clock, Trash2, RefreshCw, ExternalLink, Globe, Heart, Settings, Image, ChevronRight, ArrowLeft, ChevronDown } from 'lucide-react';

export const FeedIcon = ({ className }: { className?: string }) => <Home className={className} />;
export const AddIcon = ({ className }: { className?: string }) => <Plus className={className} />;
export const MineIcon = ({ className }: { className?: string }) => <User className={className} />;
export const ClockIcon = ({ className }: { className?: string }) => <Clock className={className} />;
export const TrashIcon = ({ className }: { className?: string }) => <Trash2 className={className} />;
export const RefreshIcon = ({ className }: { className?: string }) => <RefreshCw className={className} />;
export const LinkIcon = ({ className }: { className?: string }) => <ExternalLink className={className} />;
export const GlobeIcon = ({ className }: { className?: string }) => <Globe className={className} />;
export const HeartIcon = ({ className, fill }: { className?: string, fill?: boolean }) => <Heart className={className} fill={fill ? "currentColor" : "none"} />;
export const SettingsIcon = ({ className }: { className?: string }) => <Settings className={className} />;
export const ImageIcon = ({ className }: { className?: string }) => <Image className={className} />;
export const ChevronRightIcon = ({ className }: { className?: string }) => <ChevronRight className={className} />;
export const ArrowLeftIcon = ({ className }: { className?: string }) => <ArrowLeft className={className} />;
export const ChevronDownIcon = ({ className }: { className?: string }) => <ChevronDown className={className} />;