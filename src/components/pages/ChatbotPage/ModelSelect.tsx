import { NativeSelect } from '@mantine/core';
import axios from 'axios';
import { map } from 'lodash';
import { useEffect, useState } from 'react';

import { useModel } from '@/states/states';

import models from '../../../utility/models.json';

const ModelSelect = () => {
  const [model, setModel] = useModel();
  const [modelOptions, setModelOptions] = useState(() => {
    const storedModels = localStorage.getItem(':storedModels');
    return storedModels ? JSON.parse(storedModels) : models;
  });

  useEffect(() => {
    localStorage.setItem(':model', model);
  }, [model]);

  useEffect(() => {
    const baseUrl = localStorage.getItem(':overrideBaseUrl');
    if (baseUrl) {
      const openaiKeys = (localStorage.getItem(':openaiKey') || '').split(',');
      const openaiKey = openaiKeys[0] || '';

      axios
        .get(`${baseUrl}/v1/models`, {
          headers: {
            Authorization: `Bearer ${openaiKey}`,
          },
        })
        .then(({ data }) => {
          const newModelOptions = map(data.data, (item) => ({
            label: item.id,
            value: item.id,
            maxTokens: 100000,
            price: 0,
          }));
          setModelOptions(newModelOptions);
          // Store the new model options in localStorage
          localStorage.setItem(':storedModels', JSON.stringify(newModelOptions));
        })
        .catch(() => {
          localStorage.removeItem(':storedModels');
          setModelOptions(models);
        });
    }
  }, []);

  return (
    <>
      <NativeSelect
        value={model}
        size={'xs'}
        data={modelOptions}
        onChange={(e) => setModel(e.target.value)}
        className="w-48" // Added fixed width using Tailwind
      />
    </>
  );
};

export default ModelSelect;
