/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ensureIsArray,
  HandlerFunction,
  JsonValue,
  styled,
  t,
  VizType,
} from '@superset-ui/core';
import {
  RadioButtonOption,
  sharedControlComponents,
} from '@superset-ui/chart-controls';
import {
  AreaChartStackControlOptions,
  StackControlOptions,
} from '../constants';
import { OrientationType } from '../Timeseries/types';

const { RadioButtonControl } = sharedControlComponents;

const ExtraControlsWrapper = styled.div<{ $alignRight?: boolean }>`
  text-align: ${({ $alignRight }) => ($alignRight ? 'right' : 'center')};
`;

const DropdownControlsRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
  padding-bottom: 8px;
`;

const DropdownLabel = styled.label`
  align-items: center;
  display: inline-flex;
  font-size: 12px;
  gap: 4px;
`;

const DropdownSelect = styled.select`
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 12px;
  min-width: 130px;
  padding: 4px 8px;
  vertical-align: top;
`;

export function useExtraControl<
  F extends {
    stack: any;
    area: boolean;
  },
>({
  formData,
  setControlValue,
}: {
  formData: F;
  setControlValue?: HandlerFunction;
}) {
  const { stack, area } = formData;
  const [extraValue, setExtraValue] = useState<JsonValue | undefined>(
    stack ?? undefined,
  );

  useEffect(() => {
    setExtraValue(stack);
  }, [stack]);

  const extraControlsOptions = useMemo(() => {
    if (area) {
      return AreaChartStackControlOptions;
    }
    return [];
  }, [area]);

  const extraControlsHandler = useCallback(
    (value: RadioButtonOption[0]) => {
      if (area) {
        if (setControlValue) {
          setControlValue('stack', value);
          setExtraValue(value);
        }
      }
    },
    [area, setControlValue],
  );

  return {
    extraControlsOptions,
    extraControlsHandler,
    extraValue,
  };
}

export function ExtraControls<
  F extends {
    stack: any;
    area: boolean;
    showExtraControls: boolean;
    groupby?: unknown[];
    orientation?: OrientationType;
    viz_type?: string;
    optionsBarVisibleDropdowns?: string[];
    optionsBarDatasetColumn?: string;
    optionsBarOrientationLabel?: string;
    optionsBarStackLabel?: string;
    optionsBarColumnLabel?: string;
  },
>({
  formData,
  setControlValue,
  datasetColumns = [],
}: {
  formData: F;
  setControlValue?: HandlerFunction;
  datasetColumns?: string[];
}) {
  const { extraControlsOptions, extraControlsHandler, extraValue } =
    useExtraControl<F>({
      formData,
      setControlValue,
    });
  const vizType = formData.viz_type || (formData as any).vizType;
  const isOptionsBar = vizType === VizType.OptionsBar;
  const optionsBarStackValue = formData.stack ?? '__none__';
  const visibleDropdowns = ensureIsArray(formData.optionsBarVisibleDropdowns)
    .map(String)
    .filter(Boolean);
  const showAllDropdowns = visibleDropdowns.length === 0;
  const showOrientationDropdown =
    showAllDropdowns || visibleDropdowns.includes('orientation');
  const showStackDropdown = showAllDropdowns || visibleDropdowns.includes('stack');
  const showColumnDropdown =
    (showAllDropdowns || visibleDropdowns.includes('column')) &&
    datasetColumns.length > 0;
  const orientationLabel = formData.optionsBarOrientationLabel || t('Orientation');
  const stackLabel = formData.optionsBarStackLabel || t('Stacked Style');
  const columnLabel = formData.optionsBarColumnLabel || t('Column');
  const [selectedDatasetColumn, setSelectedDatasetColumn] = useState('');

  const getValidSelectedColumn = useCallback(() => {
    if (!datasetColumns.length) {
      return '';
    }
    if (datasetColumns.includes(selectedDatasetColumn)) {
      return selectedDatasetColumn;
    }
    if (
      formData.optionsBarDatasetColumn &&
      datasetColumns.includes(formData.optionsBarDatasetColumn)
    ) {
      return formData.optionsBarDatasetColumn;
    }
    return datasetColumns[0];
  }, [
    datasetColumns,
    formData.optionsBarDatasetColumn,
    selectedDatasetColumn,
  ]);

  useEffect(() => {
    setSelectedDatasetColumn(getValidSelectedColumn());
  }, [getValidSelectedColumn]);

  useEffect(() => {
    if (!isOptionsBar || !showColumnDropdown) {
      return;
    }
    const nextColumn = getValidSelectedColumn();
    if (!nextColumn) {
      return;
    }
    if (formData.optionsBarDatasetColumn !== nextColumn) {
      setControlValue?.('optionsBarDatasetColumn', nextColumn);
    }
  }, [
    formData.optionsBarDatasetColumn,
    getValidSelectedColumn,
    isOptionsBar,
    setControlValue,
    showColumnDropdown,
  ]);

  if (!formData.showExtraControls && !isOptionsBar) {
    return null;
  }

  if (!formData.area && !isOptionsBar) {
    return null;
  }

  return (
    <ExtraControlsWrapper $alignRight={isOptionsBar}>
      {formData.area ? (
        <RadioButtonControl
          options={extraControlsOptions}
          onChange={extraControlsHandler}
          value={extraValue}
        />
      ) : null}
      {isOptionsBar ? (
        <DropdownControlsRow>
          {showOrientationDropdown ? (
            <DropdownLabel>
              {orientationLabel}
              <DropdownSelect
                value={formData.orientation || OrientationType.Vertical}
                onChange={event =>
                  setControlValue?.('orientation', event.target.value)
                }
              >
                <option value={OrientationType.Vertical}>{t('Vertical')}</option>
                <option value={OrientationType.Horizontal}>
                  {t('Horizontal')}
                </option>
              </DropdownSelect>
            </DropdownLabel>
          ) : null}
          {showStackDropdown ? (
            <DropdownLabel>
              {stackLabel}
              <DropdownSelect
                value={String(optionsBarStackValue)}
                onChange={event =>
                  setControlValue?.(
                    'stack',
                    event.target.value === '__none__' ? null : event.target.value,
                  )
                }
              >
                {StackControlOptions.map(([value, label]) => (
                  <option
                    key={String(value ?? '__none__')}
                    value={String(value ?? '__none__')}
                  >
                    {String(label)}
                  </option>
                ))}
              </DropdownSelect>
            </DropdownLabel>
          ) : null}
          {showColumnDropdown ? (
            <DropdownLabel>
              {columnLabel}
              <DropdownSelect
                value={selectedDatasetColumn}
                onChange={event => {
                  setSelectedDatasetColumn(event.target.value);
                  setControlValue?.(
                    'optionsBarDatasetColumn',
                    event.target.value,
                  );
                }}
              >
                {datasetColumns.map(column => (
                  <option key={column} value={column}>
                    {column}
                  </option>
                ))}
              </DropdownSelect>
            </DropdownLabel>
          ) : null}
        </DropdownControlsRow>
      ) : null}
    </ExtraControlsWrapper>
  );
}
