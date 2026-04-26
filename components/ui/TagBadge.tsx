import { Tag } from '@/types';
import { getTagColorStyle } from '@/lib/utils';

interface TagBadgeProps {
  tag: Tag;
  onRemove?: () => void;
  size?: 'sm' | 'md';
}

export default function TagBadge({ tag, onRemove, size = 'sm' }: TagBadgeProps) {
  const style = getTagColorStyle(tag.color);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      }`}
      style={style}
    >
      {tag.name}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity leading-none"
        >
          ×
        </button>
      )}
    </span>
  );
}
