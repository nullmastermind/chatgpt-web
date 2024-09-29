import { NativeSelect } from '@mantine/core';
import axios from 'axios';
import { map } from 'lodash';
import { useEffect, useState } from 'react';

import { useModel } from '@/states/states';

import models from '../../../utility/models.json';

const ModelSelect = () => {
  const [model, setModel] = useModel();
  const [modelOptions, setModelOptions] = useState(models);

  useEffect(() => {
    localStorage.setItem(':model', model);
  }, [model]);

  useEffect(() => {
    const baseUrl = localStorage.getItem(':overrideBaseUrl');
    if (baseUrl) {
      const openaiKeys = (localStorage.getItem(':openaiKey') || '').split(',');
      const openaiKey = openaiKeys[0] || '';

      axios
        .get(`${baseUrl}/models`, {
          headers: {
            Authorization: `Bearer ${openaiKey}`,
          },
        })
        .then(({ data }) => {
          setModelOptions(
            map(data.data, (item) => {
              return { label: item.id, value: item.id, maxTokens: 100000, price: 0 } as any;
            }),
          );
        })
        .catch(Promise.resolve);
    }
  }, []);

  return (
    <>
      <NativeSelect
        value={model}
        size={'xs'}
        data={modelOptions}
        onChange={(e) => setModel(e.target.value)}
      />
    </>
  );
};

export default ModelSelect;
