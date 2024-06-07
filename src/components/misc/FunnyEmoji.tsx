import classNames from 'classnames';
import React, { ComponentPropsWithRef, memo, useMemo, useState } from 'react';

import { EmojiType, getFunEmojiUrl } from '@/utility/emoji';

const FunnyEmoji = memo<
  {
    emoji: string;
    emojiType: EmojiType;
    size: number;
  } & ComponentPropsWithRef<'img'>
>(({ emojiType, size, emoji, className }) => {
  const [loaded, setLoaded] = useState(false);
  const emojiUrl = useMemo(() => {
    return getFunEmojiUrl(emoji, emojiType);
  }, [emoji, emojiType]);

  return (
    <div
      style={{
        width: size,
        height: size,
      }}
      className={'flex flex-row items-center justify-center relative'}
    >
      <div
        className={'absolute flex top-0 left-0 w-full h-full flex-row items-center justify-center'}
      >
        <img
          src={emojiUrl}
          width={size}
          height={size}
          alt={emoji}
          className={classNames(className, {
            'fade-in': loaded,
            'fade-out': !loaded,
          })}
          onLoad={() => setLoaded(true)}
        />
      </div>
      <div
        className={'absolute flex top-0 left-0 w-full h-full flex-row items-center justify-center'}
      >
        <span
          className={classNames({
            'fade-in': !loaded,
            'fade-out': loaded,
          })}
        >
          {emoji}
        </span>
      </div>
    </div>
  );
});

export default FunnyEmoji;
