import { NativeSelect } from '@mantine/core';
import { useEffect } from 'react';

import { useModel } from '@/states/states';

import models from '../../../utility/models.json';

const ModelSelect = () => {
  const [model, setModel] = useModel();

  useEffect(() => {
    localStorage.setItem(':model', model);
  }, [model]);

  return (
    <>
      <NativeSelect
        value={model}
        size={'xs'}
        data={models}
        onChange={(e) => setModel(e.target.value)}
      />
    </>
  );
};

export default ModelSelect;
