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
import { useState, useEffect, useRef, MouseEvent } from 'react';
import {
  t,
  getNumberFormatter,
  getTimeFormatter,
  SMART_DATE_VERBOSE_ID,
  computeMaxFontSize,
  BRAND_COLOR,
  styled,
  BinaryQueryObjectFilterClause,
  useTheme,
} from '@superset-ui/core';
import Echart from '../components/Echart';
import { BigNumberVizProps } from './types';
import { EventHandlers } from '../types';

const defaultNumberFormatter = getNumberFormatter();

const PROPORTION = {
  METRIC_NAME: 0.125,
  KICKER: 0.1,
  HEADER: 0.3,
  SUBHEADER: 0.125,
  TRENDLINE: 0.3,
};

function BigNumberShared({
  className = '',
  headerFormatter = defaultNumberFormatter,
  formatTime = getTimeFormatter(SMART_DATE_VERBOSE_ID),
  headerFontSize = PROPORTION.HEADER,
  useFixedFontSize = false,
  fixedFontSize,
  kickerFontSize = PROPORTION.KICKER,
  metricNameFontSize = PROPORTION.METRIC_NAME,
  showMetricName = true,
  mainColor = BRAND_COLOR,
  showTimestamp = false,
  showTrendLine = false,
  startYAxisAtZero = true,
  subheader = '',
  subheaderFontSize = PROPORTION.SUBHEADER,
  subtitleFontSize = PROPORTION.SUBHEADER,
  ...props
}: BigNumberVizProps) {
  const theme = useTheme();
  const [elementsRendered, setElementsRendered] = useState(false);
  const metricNameRef = useRef<HTMLDivElement>(null);
  const kickerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const subheaderRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setElementsRendered(true);
    }, 0);
    return () => clearTimeout(timeout);
  }, []);

  const getClassName = () => {
    const names = `superset-legacy-chart-big-number ${className} ${
      props.bigNumberFallback ? 'is-fallback-value' : ''
    }`;
    if (showTrendLine) return names;
    return `${names} no-trendline`;
  };

  const createTemporaryContainer = () => {
    const container = document.createElement('div');
    container.className = getClassName();
    container.style.position = 'absolute';
    container.style.opacity = '0';
    return container;
  };

  const renderFallbackWarning = () => {
    const { bigNumberFallback } = props;
    if (!formatTime || !bigNumberFallback || showTimestamp) return null;
    return (
      <span
        className="alert alert-warning"
        role="alert"
        title={t(
          `Last available value seen on %s`,
          formatTime(bigNumberFallback[0]),
        )}
      >
        {t('Not up to date')}
      </span>
    );
  };

  const renderMetricName = (maxHeight: number) => {
    const { metricName, width } = props;
    if (!showMetricName || !metricName) return null;

    const container = createTemporaryContainer();
    document.body.append(container);
    const fontSize = computeMaxFontSize({
      text: metricName,
      maxWidth: width,
      maxHeight,
      className: 'metric-name',
      container,
    });
    container.remove();

    return (
      <div
        ref={metricNameRef}
        className="metric-name"
        style={{ fontSize, height: 'auto' }}
      >
        {metricName}
      </div>
    );
  };

  const renderKicker = (maxHeight: number) => {
    const { timestamp, width } = props;
    if (
      !formatTime ||
      !showTimestamp ||
      typeof timestamp === 'string' ||
      typeof timestamp === 'bigint' ||
      typeof timestamp === 'boolean'
    ) {
      return null;
    }

    const text = timestamp === null ? '' : formatTime(timestamp);

    const container = createTemporaryContainer();
    document.body.append(container);
    const fontSize = computeMaxFontSize({
      text,
      maxWidth: width,
      maxHeight,
      className: 'kicker',
      container,
    });
    container.remove();

    return (
      <div
        ref={kickerRef}
        className="kicker"
        style={{ fontSize, height: 'auto' }}
      >
        {text}
      </div>
    );
  };

  const renderHeader = (maxHeight: number) => {
    const { bigNumber, width, colorThresholdFormatters, onContextMenu } = props;
    // @ts-ignore
    const text = bigNumber === null ? t('No data') : headerFormatter(bigNumber);

    const hasThresholdColorFormatter =
      Array.isArray(colorThresholdFormatters) &&
      colorThresholdFormatters.length > 0;

    let numberColor;
    if (hasThresholdColorFormatter) {
      colorThresholdFormatters!.forEach(formatter => {
        const formatterResult = bigNumber
          ? formatter.getColorFromValue(bigNumber as number)
          : false;
        if (formatterResult) {
          numberColor = formatterResult;
        }
      });
    } else {
      numberColor = theme.colorText;
    }

    let fontSize;
    if (useFixedFontSize && fixedFontSize) {
      fontSize = fixedFontSize;
    } else {
      const container = createTemporaryContainer();
      document.body.append(container);
      fontSize = computeMaxFontSize({
        text,
        maxWidth: width * 0.9,
        maxHeight,
        className: 'header-line',
        container,
      });
      container.remove();
    }

    const handleContextMenu = (e: MouseEvent<HTMLDivElement>) => {
      if (onContextMenu) {
        e.preventDefault();
        onContextMenu(e.nativeEvent.clientX, e.nativeEvent.clientY);
      }
    };

    return (
      <div
        ref={headerRef}
        className="header-line"
        style={{
          display: 'flex',
          alignItems: 'center',
          fontSize,
          height: 'auto',
          color: numberColor,
        }}
        onContextMenu={handleContextMenu}
      >
        {text}
      </div>
    );
  };

  const renderMetricComparisonSummary = (maxHeight: number) => {
    const { width } = props;
    if (!subheader) return null;

    const container = createTemporaryContainer();
    document.body.append(container);
    let fontSize = 0;
    try {
      fontSize = computeMaxFontSize({
        text: subheader,
        maxWidth: width * 0.9,
        maxHeight,
        className: 'subheader-line',
        container,
      });
    } finally {
      container.remove();
    }

    return (
      <div
        ref={subheaderRef}
        className="subheader-line"
        style={{ fontSize, height: maxHeight }}
      >
        {subheader}
      </div>
    );
  };

  const renderSubtitle = (maxHeight: number) => {
    const { subtitle, width, bigNumber, bigNumberFallback } = props;
    const noDataOrHasntLanded = t(
      'No data after filtering or data is NULL for the latest time record',
    );
    const noData = t(
      'Try applying different filters or ensuring your datasource has data',
    );

    let text = subtitle;
    if (bigNumber === null) {
      text =
        subtitle || (bigNumberFallback ? noData : noDataOrHasntLanded);
    }
    if (!text) return null;

    const container = createTemporaryContainer();
    document.body.append(container);
    const fontSize = computeMaxFontSize({
      text,
      maxWidth: width * 0.9,
      maxHeight,
      className: 'subtitle-line',
      container,
    });
    container.remove();

    return (
      <div
        ref={subtitleRef}
        className="subtitle-line subheader-line"
        style={{ fontSize: `${fontSize}px`, height: maxHeight }}
      >
        {text}
      </div>
    );
  };

  const renderTrendline = (maxHeight: number) => {
    const {
      width,
      trendLineData,
      echartOptions,
      refs,
      onContextMenu,
      formData,
      xValueFormatter,
    } = props;

    if (!trendLineData?.some(d => d[1] !== null)) {
      return null;
    }

    const eventHandlers: EventHandlers = {
      contextmenu: eventParams => {
        if (onContextMenu) {
          eventParams.event.stop();
          const { data } = eventParams;
          if (data) {
            const pointerEvent = eventParams.event.event;
            const drillToDetailFilters: BinaryQueryObjectFilterClause[] = [];
            drillToDetailFilters.push({
              col: formData?.granularitySqla,
              grain: formData?.timeGrainSqla,
              op: '==',
              val: data[0],
              formattedVal: xValueFormatter?.(data[0]),
            });
            onContextMenu(pointerEvent.clientX, pointerEvent.clientY, {
              drillToDetail: drillToDetailFilters,
            });
          }
        }
      },
    };

    return (
      echartOptions && (
        <Echart
          refs={refs}
          width={Math.floor(width)}
          height={maxHeight}
          echartOptions={echartOptions}
          eventHandlers={eventHandlers}
        />
      )
    );
  };

  const getTotalElementsHeight = () => {
    const refs = [
      metricNameRef,
      kickerRef,
      headerRef,
      subheaderRef,
      subtitleRef,
    ];
    const visibleRefs = refs.filter(ref => ref.current);
    return visibleRefs.reduce((sum, ref, index) => {
      const height = ref.current?.offsetHeight || 0;
      const margin = index < visibleRefs.length - 1 ? 8 : 0;
      return sum + height + margin;
    }, 0);
  };

  const shouldApplyOverflow = (availableHeight: number) => {
    if (!elementsRendered) return false;
    return getTotalElementsHeight() > availableHeight;
  };

  const { height } = props;
  const componentClassName = getClassName();

  if (showTrendLine) {
    const chartHeight = Math.floor(PROPORTION.TRENDLINE * height);
    const allTextHeight = height - chartHeight;
    const overflow = shouldApplyOverflow(allTextHeight);

    return (
      <div className={componentClassName}>
        <div
          className="text-container"
          style={{
            height: allTextHeight,
            ...(overflow
              ? {
                  display: 'block',
                  boxSizing: 'border-box',
                  overflowX: 'hidden',
                  overflowY: 'auto',
                  width: '100%',
                }
              : {}),
          }}
        >
          {renderFallbackWarning()}
          {renderMetricName(
            Math.ceil(
              (metricNameFontSize || 0) * (1 - PROPORTION.TRENDLINE) * height,
            ),
          )}
          {renderKicker(
            Math.ceil(
              (kickerFontSize || 0) * (1 - PROPORTION.TRENDLINE) * height,
            ),
          )}
          {renderHeader(
            Math.ceil(headerFontSize * (1 - PROPORTION.TRENDLINE) * height),
          )}
          {renderMetricComparisonSummary(
            Math.ceil(subheaderFontSize * (1 - PROPORTION.TRENDLINE) * height),
          )}
          {renderSubtitle(
            Math.ceil(subtitleFontSize * (1 - PROPORTION.TRENDLINE) * height),
          )}
        </div>
        {renderTrendline(chartHeight)}
      </div>
    );
  }

  const overflow = shouldApplyOverflow(height);
  return (
    <div
      className={componentClassName}
      style={{
        height,
        ...(overflow
          ? {
              display: 'block',
              boxSizing: 'border-box',
              overflowX: 'hidden',
              overflowY: 'auto',
              width: '100%',
            }
          : {}),
      }}
    >
      <div className="text-container">
        {renderFallbackWarning()}
        {renderMetricName((metricNameFontSize || 0) * height)}
        {renderKicker((kickerFontSize || 0) * height)}
        {renderHeader(Math.ceil(headerFontSize * height))}
        {renderMetricComparisonSummary(Math.ceil(subheaderFontSize * height))}
        {renderSubtitle(Math.ceil(subtitleFontSize * height))}
      </div>
    </div>
  );
}

const StyledBigNumberShared = styled(BigNumberShared)`
  ${({ theme }) => `
    font-family: ${theme.fontFamily};
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;

    &.no-trendline .subheader-line {
      padding-bottom: 0.3em;
    }

    .text-container {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: flex-start;
      .alert {
        font-size: ${theme.fontSizeSM};
        margin: -0.5em 0 0.4em;
        line-height: 1;
        padding: ${theme.sizeUnit}px;
        border-radius: ${theme.borderRadius}px;
      }
    }

    .kicker {
      line-height: 1em;
      margin-bottom: ${theme.sizeUnit * 2}px;
    }

    .metric-name {
      line-height: 1em;
      margin-bottom: ${theme.sizeUnit * 2}px;
    }

    .header-line {
      position: relative;
      line-height: 1em;
      white-space: nowrap;
      margin-bottom:${theme.sizeUnit * 2}px;
      span {
        position: absolute;
        bottom: 0;
      }
    }

    .subheader-line {
      line-height: 1em;
      margin-bottom: ${theme.sizeUnit * 2}px;
    }

    .subtitle-line {
      line-height: 1em;
      margin-bottom: ${theme.sizeUnit * 2}px;
    }

    &.is-fallback-value {
      .kicker,
      .header-line,
      .subheader-line {
        opacity: 60%;
      }
    }
  `}
`;

export default StyledBigNumberShared;
