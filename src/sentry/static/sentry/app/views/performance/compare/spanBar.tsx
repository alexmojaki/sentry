import React from 'react';
import styled from '@emotion/styled';

import theme from 'app/utils/theme';
import space from 'app/styles/space';
import Count from 'app/components/count';
import {TreeDepthType} from 'app/components/events/interfaces/spans/types';
import {SPAN_ROW_HEIGHT, SpanRow} from 'app/components/events/interfaces/spans/styles';
import {
  TOGGLE_BORDER_BOX,
  SpanRowCellContainer,
  SpanRowCell,
  SpanBarTitleContainer,
  SpanBarTitle,
  OperationName,
  Chevron,
  SpanTreeTogglerContainer,
  ConnectorBar,
  SpanTreeConnector,
  SpanTreeToggler,
  DividerLine,
} from 'app/components/events/interfaces/spans/spanBar';
import {
  toPercent,
  unwrapTreeDepth,
  isOrphanTreeDepth,
  getHumanDuration,
} from 'app/components/events/interfaces/spans/utils';
import * as DividerHandlerManager from 'app/components/events/interfaces/spans/dividerHandlerManager';

import {
  DiffSpanType,
  getSpanID,
  getSpanOperation,
  getSpanDescription,
  isOrphanDiffSpan,
  SpanGeneratedBoundsType,
  getSpanDuration,
  generateCSSWidth,
} from './utils';
import SpanDetail from './spanDetail';

type Props = {
  span: Readonly<DiffSpanType>;
  treeDepth: number;
  continuingTreeDepths: Array<TreeDepthType>;
  spanNumber: number;
  numOfSpanChildren: number;
  isRoot: boolean;
  isLast: boolean;
  showSpanTree: boolean;
  toggleSpanTree: () => void;
  generateBounds: (span: DiffSpanType) => SpanGeneratedBoundsType;
};

type State = {
  showDetail: boolean;
};

class SpanBar extends React.Component<Props, State> {
  state: State = {
    showDetail: false,
  };

  renderSpanTreeConnector = ({hasToggler}: {hasToggler: boolean}) => {
    const {
      isLast,
      isRoot,
      treeDepth: spanTreeDepth,
      continuingTreeDepths,
      span,
    } = this.props;

    const spanID = getSpanID(span);

    if (isRoot) {
      if (hasToggler) {
        return (
          <ConnectorBar
            style={{right: '16px', height: '10px', bottom: '-5px', top: 'auto'}}
            key={`${spanID}-last`}
            orphanBranch={false}
          />
        );
      }

      return null;
    }

    const connectorBars: Array<React.ReactNode> = continuingTreeDepths.map(treeDepth => {
      const depth: number = unwrapTreeDepth(treeDepth);

      if (depth === 0) {
        // do not render a connector bar at depth 0,
        // if we did render a connector bar, this bar would be placed at depth -1
        // which does not exist.
        return null;
      }
      const left = ((spanTreeDepth - depth) * (TOGGLE_BORDER_BOX / 2) + 1) * -1;

      return (
        <ConnectorBar
          style={{left}}
          key={`${spanID}-${depth}`}
          orphanBranch={isOrphanTreeDepth(treeDepth)}
        />
      );
    });

    if (hasToggler) {
      // if there is a toggle button, we add a connector bar to create an attachment
      // between the toggle button and any connector bars below the toggle button
      connectorBars.push(
        <ConnectorBar
          style={{
            right: '16px',
            height: '10px',
            bottom: isLast ? `-${SPAN_ROW_HEIGHT / 2}px` : '0',
            top: 'auto',
          }}
          key={`${spanID}-last`}
          orphanBranch={false}
        />
      );
    }

    return (
      <SpanTreeConnector
        isLast={isLast}
        hasToggler={hasToggler}
        orphanBranch={isOrphanDiffSpan(span)}
      >
        {connectorBars}
      </SpanTreeConnector>
    );
  };

  renderSpanTreeToggler = ({left}: {left: number}) => {
    const {numOfSpanChildren, isRoot} = this.props;

    const chevronSrc = this.props.showSpanTree ? 'icon-chevron-up' : 'icon-chevron-down';
    const chevron = <Chevron src={chevronSrc} />;

    if (numOfSpanChildren <= 0) {
      return (
        <SpanTreeTogglerContainer style={{left: `${left}px`}}>
          {this.renderSpanTreeConnector({hasToggler: false})}
        </SpanTreeTogglerContainer>
      );
    }

    const chevronElement = !isRoot ? <div>{chevron}</div> : null;

    return (
      <SpanTreeTogglerContainer style={{left: `${left}px`}} hasToggler>
        {this.renderSpanTreeConnector({hasToggler: true})}
        <SpanTreeToggler
          disabled={!!isRoot}
          isExpanded={this.props.showSpanTree}
          onClick={event => {
            event.stopPropagation();

            if (isRoot) {
              return;
            }

            this.props.toggleSpanTree();
          }}
        >
          <Count value={numOfSpanChildren} />
          {chevronElement}
        </SpanTreeToggler>
      </SpanTreeTogglerContainer>
    );
  };

  renderTitle() {
    const {span, treeDepth} = this.props;

    const operationName = getSpanOperation(span) ? (
      <strong>
        <OperationName spanErrors={[]}>{getSpanOperation(span)}</OperationName>
        {` \u2014 `}
      </strong>
    ) : (
      ''
    );
    const description = getSpanDescription(span) ?? getSpanID(span);

    const left = treeDepth * (TOGGLE_BORDER_BOX / 2);

    return (
      <SpanBarTitleContainer>
        {this.renderSpanTreeToggler({left})}
        <SpanBarTitle
          style={{
            left: `${left}px`,
            width: '100%',
          }}
        >
          <span>
            {operationName}
            {description}
          </span>
        </SpanBarTitle>
      </SpanBarTitleContainer>
    );
  }

  renderDivider = (
    dividerHandlerChildrenProps: DividerHandlerManager.DividerHandlerManagerChildrenProps
  ) => {
    if (this.state.showDetail) {
      // we would like to hide the divider lines when the span details
      // has been expanded
      return null;
    }

    const {
      dividerPosition,
      addDividerLineRef,
      addGhostDividerLineRef,
    } = dividerHandlerChildrenProps;

    // We display the ghost divider line for whenever the divider line is being dragged.
    // The ghost divider line indicates the original position of the divider line
    const ghostDivider = (
      <DividerLine
        ref={addGhostDividerLineRef()}
        style={{
          left: `calc(${toPercent(dividerPosition)} + 1px)`,
          display: 'none',
        }}
        onClick={event => {
          // the ghost divider line should not be interactive.
          // we prevent the propagation of the clicks from this component to prevent
          // the span detail from being opened.
          event.stopPropagation();
        }}
      />
    );

    return (
      <React.Fragment>
        {ghostDivider}
        <DividerLine
          ref={addDividerLineRef()}
          style={{
            left: `calc(${toPercent(dividerPosition)} + 1px)`,
          }}
          onMouseEnter={() => {
            dividerHandlerChildrenProps.setHover(true);
          }}
          onMouseLeave={() => {
            dividerHandlerChildrenProps.setHover(false);
          }}
          onMouseOver={() => {
            dividerHandlerChildrenProps.setHover(true);
          }}
          onMouseDown={dividerHandlerChildrenProps.onDragStart}
          onClick={event => {
            // we prevent the propagation of the clicks from this component to prevent
            // the span detail from being opened.
            event.stopPropagation();
          }}
        />
      </React.Fragment>
    );
  };

  getSpanBarStyles() {
    const {span, generateBounds} = this.props;

    const bounds = generateBounds(span);

    switch (span.comparisonResult) {
      case 'matched': {
        const baselineDuration = getSpanDuration(span.baselineSpan);
        const regressionDuration = getSpanDuration(span.regressionSpan);

        if (baselineDuration === regressionDuration) {
          return {
            background: {
              color: undefined,
              width: generateCSSWidth(bounds.background),
              hatch: true,
            },
            foreground: undefined,
          };
        }

        if (baselineDuration > regressionDuration) {
          return {
            background: {
              // baseline
              color: theme.gray5,
              width: generateCSSWidth(bounds.background),
            },
            foreground: {
              // regression
              color: undefined,
              width: generateCSSWidth(bounds.foreground),
              hatch: true,
            },
          };
        }

        // case: baselineDuration < regressionDuration

        return {
          background: {
            // regression
            color: theme.purpleLightest,
            width: generateCSSWidth(bounds.background),
          },
          foreground: {
            // baseline
            color: undefined,
            width: generateCSSWidth(bounds.foreground),
            hatch: true,
          },
        };
      }
      case 'regression': {
        return {
          background: {
            color: theme.purpleLightest,
            width: generateCSSWidth(bounds.background),
          },
          foreground: undefined,
        };
      }
      case 'baseline': {
        return {
          background: {
            color: theme.gray5,
            width: generateCSSWidth(bounds.background),
          },
          foreground: undefined,
        };
      }
      default: {
        const _exhaustiveCheck: never = span;
        return _exhaustiveCheck;
      }
    }
  }

  renderComparisonReportLabel() {
    const {span} = this.props;

    switch (span.comparisonResult) {
      case 'matched': {
        const baselineDuration = getSpanDuration(span.baselineSpan);
        const regressionDuration = getSpanDuration(span.regressionSpan);

        let label: string = '';

        if (baselineDuration === regressionDuration) {
          label = 'no change';
        }

        if (baselineDuration > regressionDuration) {
          const duration = getHumanDuration(
            Math.abs(baselineDuration - regressionDuration)
          );

          label = `- ${duration} faster`;
        }

        if (baselineDuration < regressionDuration) {
          const duration = getHumanDuration(
            Math.abs(baselineDuration - regressionDuration)
          );

          label = `- ${duration} slower`;
        }

        return <ComparisonReportLabelContainer>{label}</ComparisonReportLabelContainer>;
      }
      case 'baseline': {
        // TODO: need to flesh this out.
        return (
          <ComparisonReportLabelContainer>
            removed from baseline
          </ComparisonReportLabelContainer>
        );
      }
      case 'regression': {
        const regressionDuration = getSpanDuration(span.regressionSpan);

        const duration = getHumanDuration(regressionDuration);

        return (
          <ComparisonReportLabelContainer>{`+ ${duration} added`}</ComparisonReportLabelContainer>
        );
      }
      default: {
        const _exhaustiveCheck: never = span;
        return _exhaustiveCheck;
      }
    }
  }

  renderHeader(
    dividerHandlerChildrenProps: DividerHandlerManager.DividerHandlerManagerChildrenProps
  ) {
    const {dividerPosition} = dividerHandlerChildrenProps;
    const {spanNumber} = this.props;

    const spanBarStyles = this.getSpanBarStyles();

    const foregroundSpanBar = spanBarStyles.foreground ? (
      <SpanBarRectangle
        spanBarHatch={spanBarStyles.foreground.hatch ?? false}
        style={{
          backgroundColor: spanBarStyles.foreground.color,
          left: '0',
          width: spanBarStyles.foreground.width,
          position: 'absolute',
          top: '4px',
          height: '16px',
        }}
      />
    ) : null;
    return (
      <SpanRowCellContainer>
        <SpanRowCell
          style={{
            left: 0,
            width: toPercent(dividerPosition),
          }}
        >
          {this.renderTitle()}
        </SpanRowCell>
        <SpanRowCell
          showStriping={spanNumber % 2 !== 0}
          style={{
            left: `calc(${toPercent(dividerPosition)} + 1px)`,
            width: `calc(${toPercent(1 - dividerPosition)} - 1px)`,
          }}
        >
          <SpanBarRectangle
            spanBarHatch={spanBarStyles.background.hatch ?? false}
            style={{
              backgroundColor: spanBarStyles.background.color,
              left: '0',
              width: spanBarStyles.background.width,
              position: 'absolute',
              top: '4px',
              height: '16px',
            }}
          />
          {foregroundSpanBar}
          {this.renderComparisonReportLabel()}
        </SpanRowCell>
        {this.renderDivider(dividerHandlerChildrenProps)}
      </SpanRowCellContainer>
    );
  }

  toggleDisplayDetail = () => {
    this.setState(state => ({
      showDetail: !state.showDetail,
    }));
  };

  renderDetail() {
    if (!this.state.showDetail) {
      return null;
    }

    return <SpanDetail />;
  }

  render() {
    return (
      <SpanRow
        visible
        onClick={() => {
          this.toggleDisplayDetail();
        }}
      >
        <DividerHandlerManager.Consumer>
          {(
            dividerHandlerChildrenProps: DividerHandlerManager.DividerHandlerManagerChildrenProps
          ) => this.renderHeader(dividerHandlerChildrenProps)}
        </DividerHandlerManager.Consumer>
        {this.renderDetail()}
      </SpanRow>
    );
  }
}

const getHatchPattern = ({spanBarHatch}) => {
  if (spanBarHatch === true) {
    return `
        background-image: linear-gradient(135deg, #9f92fa 33.33%, #302839 33.33%, #302839 50%, #9f92fa 50%, #9f92fa 83.33%, #302839 83.33%, #302839 100%);
        background-size: 4.24px 4.24px;
    `;
  }

  return null;
};

const SpanBarRectangle = styled('div')<{spanBarHatch: boolean}>`
  position: relative;
  height: 100%;
  min-width: 1px;
  user-select: none;
  transition: border-color 0.15s ease-in-out;
  border-right: 1px solid rgba(0, 0, 0, 0);
  ${getHatchPattern}
`;

const ComparisonReportLabelContainer = styled('div')`
  position: absolute;
  height: 100%;
  user-select: none;
  right: ${space(1)};

  line-height: 16px;
  top: 4px;
  height: 16px;

  font-size: ${p => p.theme.fontSizeExtraSmall};
`;

export default SpanBar;
