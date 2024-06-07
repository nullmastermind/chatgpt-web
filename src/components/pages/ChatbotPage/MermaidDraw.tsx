import { Card, ScrollArea, Switch, Tabs } from '@mantine/core';
import { Prism } from '@mantine/prism';
import classNames from 'classnames';
import mermaid from 'mermaid';
import panzoom, { PanZoom } from 'panzoom';
import { RefObject, memo, useEffect, useRef, useState } from 'react';
import { v4 } from 'uuid';

import useStyles from '@/components/pages/ChatbotPage/Message.style';
import { convertToSupportLang } from '@/utility/utility';

mermaid.initialize({ startOnLoad: false, theme: 'dark' });

const MermaidDraw = memo<{
  content: string;
  messagePageScroll?: RefObject<HTMLDivElement>;
}>(({ content, messagePageScroll }) => {
  const { classes } = useStyles();
  const [loading, setLoading] = useState(true);
  const mermaidDockBlock = useRef<HTMLDivElement>(null);
  const [id, setId] = useState(v4());
  const [enablePanNZoom, setEnablePanNZoom] = useState(false);
  const panNZoomInstance = useRef<PanZoom>(null);

  useEffect(() => {
    if (!mermaidDockBlock.current) return;
    const prevHeight = mermaidDockBlock.current.getBoundingClientRect().height;
    mermaid
      .render(id, content)
      .then((value) => {
        mermaidDockBlock.current!.innerHTML = value.svg;
        setLoading(false);
        // handle offset height
        const offsetHeight = mermaidDockBlock.current!.getBoundingClientRect().height - prevHeight;
        if (offsetHeight !== 0) {
          messagePageScroll?.current?.scrollBy({
            top: offsetHeight,
          });
        }
      })
      .catch((e) => {
        if (e.toString().includes('is not a valid selector')) {
          setId(v4());
        }
      });
  }, [content, id]);
  useEffect(() => {
    if (enablePanNZoom) {
      if (!panNZoomInstance.current) {
        // @ts-ignore
        panNZoomInstance.current = panzoom(mermaidDockBlock.current!, {
          minZoom: 0.3,
          maxZoom: 5,
        });
      } else if (panNZoomInstance.current.isPaused()) panNZoomInstance.current.resume();
    } else {
      if (panNZoomInstance.current) {
        panNZoomInstance.current.pause();
      }
    }
  }, [enablePanNZoom]);

  return (
    <div className={'py-5'}>
      <Tabs defaultValue={'diagram'}>
        <Tabs.List>
          <Tabs.Tab value={'diagram'}>Diagram</Tabs.Tab>
          <Tabs.Tab value={'text'}>Text</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value={'diagram'}>
          <div className={'flex relative flex-row justify-center py-2 overflow-hidden'}>
            <Card className={'w-full min-h-[256px]'}>
              <div
                ref={mermaidDockBlock}
                className="w-full !p-0 whitespace-pre-wrap relative my-5 flex flex-row items-center justify-center"
              />
            </Card>
            {loading && (
              <div
                className={'flex absolute top-0 left-0 w-full h-full items-center justify-center'}
              >
                <div>Drawing diagram...</div>
              </div>
            )}
            <div className={'absolute top-0 left-0 p-2 py-3'}>
              <Switch
                checked={enablePanNZoom}
                label={'Pan & Zoom'}
                onChange={(e) => {
                  setEnablePanNZoom(e.target.checked);
                }}
              />
            </div>
          </div>
        </Tabs.Panel>
        <Tabs.Panel value={'text'}>
          <Prism
            children={content}
            language={convertToSupportLang('mermaid')}
            scrollAreaComponent={ScrollArea}
            className={classNames('mb-1', classes.codeWrap)}
          />
        </Tabs.Panel>
      </Tabs>
    </div>
  );
});

export default MermaidDraw;
