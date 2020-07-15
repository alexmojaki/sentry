import React from 'react';
import styled from '@emotion/styled';
import 'react-virtualized/styles.css';
import {
  Table,
  Column,
  CellMeasurerCache,
  CellMeasurer,
  AutoSizer,
  TableCellRenderer,
  TableCellProps,
} from 'react-virtualized';

import Tooltip from 'app/components/tooltip';
import space from 'app/styles/space';
import {t} from 'app/locale';

import Time from './time/time';
import Data from './data/data';
import Category from './category';
import Icon from './icon';
import Level from './level';
import {Breadcrumb, BreadcrumbsWithDetails, BreadcrumbType} from './types';

import ListHeader from './listHeader';
import ListBody from './listBody';
import {aroundContentStyle, GridCellLeft, GridCell} from './styles';

type Props = {
  onSwitchTimeFormat: () => void;
} & Omit<React.ComponentProps<typeof ListBody>, 'relativeTime'>;

type State = {
  columnsWidth: Array<number>;
  listBodyHeight?: number;
};

const cache = new CellMeasurerCache({
  fixedWidth: true,
  minHeight: 25,
  defaultHeight: 65, //currently, this is the height the cell sizes to after calling 'toggleHeight'
});

class List extends React.Component<Props, State> {
  state: State = {
    columnsWidth: [],
  };

  componentDidMount() {
    this.loadState();
  }

  listBodyRef = React.createRef<HTMLDivElement>();
  listTable: Table | null = null;

  loadState() {
    const columnsWidth: Array<number> = [];

    const children = this.listBodyRef?.current?.children;

    for (const childIndex in children) {
      columnsWidth.push(children[childIndex].offsetWidth);
    }

    this.setState({
      listBodyHeight: this.listBodyRef?.current?.offsetHeight,
      columnsWidth,
    });
  }

  renderCell = ({
    dataKey,
    parent,
    rowIndex,
    columnIndex,
    children,
  }: TableCellProps & {children: React.ReactNode}) => {
    return (
      <CellMeasurer
        cache={cache}
        columnIndex={columnIndex}
        key={dataKey}
        parent={parent}
        rowIndex={rowIndex}
      >
        {children}
      </CellMeasurer>
    );
  };
  render() {
    const {
      onSwitchTimeFormat,
      displayRelativeTime,
      searchTerm,
      event,
      orgId,
      breadcrumbs,
    } = this.props;
    const {listBodyHeight, columnsWidth} = this.state;

    if (!listBodyHeight) {
      return (
        <Grid ref={this.listBodyRef}>
          <ListHeader
            onSwitchTimeFormat={onSwitchTimeFormat}
            displayRelativeTime={!!displayRelativeTime}
          />
          <ListBody
            searchTerm={searchTerm}
            event={event}
            orgId={orgId}
            breadcrumbs={breadcrumbs}
            relativeTime={breadcrumbs[breadcrumbs.length - 1]?.timestamp}
            displayRelativeTime={!!displayRelativeTime}
          />
        </Grid>
      );
    }

    return (
      <AutoSizer disableHeight>
        {({width}) => (
          <StyledTable
            ref={el => {
              this.listTable = el;
            }}
            width={width}
            height={listBodyHeight}
            rowHeight={cache.rowHeight}
            rowCount={breadcrumbs.length}
            rowGetter={({index}) => breadcrumbs[index]}
            headerHeight={47}
          >
            <Column
              className="column"
              headerClassName="header"
              dataKey="type"
              width={columnsWidth[0]}
              headerRenderer={() => <StyledGridCell>{t('Type')}</StyledGridCell>}
              cellRenderer={props => {
                const {description, icon, color} = props.rowData;
                return this.renderCell({
                  ...props,
                  children: (
                    <GridCellLeft>
                      <Tooltip title={description}>
                        <Icon icon={icon} color={color} />
                      </Tooltip>
                    </GridCellLeft>
                  ),
                });
              }}
            />
            <Column
              className="column"
              headerClassName="header"
              dataKey="category"
              width={columnsWidth[1]}
              headerRenderer={() => <CategoryHeader>{t('Category')}</CategoryHeader>}
              cellRenderer={props => {
                const {category} = props.rowData;
                return this.renderCell({
                  ...props,
                  children: (
                    <GridCell>
                      <Category category={category} searchTerm={searchTerm} />
                    </GridCell>
                  ),
                });
              }}
            />
            <Column
              headerClassName="header"
              style={{height: 'auto !important'}}
              dataKey="description"
              width={columnsWidth[2]}
              headerRenderer={() => <CategoryHeader>{t('Description')}</CategoryHeader>}
              cellRenderer={props => {
                return this.renderCell({
                  ...props,
                  children: (
                    <GridCell>
                      <Data
                        event={event}
                        orgId={orgId}
                        breadcrumb={props.rowData as Breadcrumb}
                        searchTerm={searchTerm}
                      />
                    </GridCell>
                  ),
                });
              }}
            />
          </StyledTable>
        )}
      </AutoSizer>
    );
  }
}

const StyledTable = styled(Table)`
  .column,
  .header {
    margin: 0 !important;
    height: 100% !important;
    > *:first-child {
      margin: 0 !important;
      height: 100% !important;
    }
  }
`;
// const List = React.forwardRef(
//   (
//     {
//       displayRelativeTime,
//       onSwitchTimeFormat,
//       orgId,
//       event,
//       breadcrumbs,
//       searchTerm,
//     }: Props,
//     ref: React.Ref<HTMLDivElement>
//   ) => (
// <Grid ref={ref}>
//   <ListHeader
//     onSwitchTimeFormat={onSwitchTimeFormat}
//     displayRelativeTime={!!displayRelativeTime}
//   />
//   <ListBody
//     searchTerm={searchTerm}
//     event={event}
//     orgId={orgId}
//     breadcrumbs={breadcrumbs}
//     relativeTime={breadcrumbs[breadcrumbs.length - 1]?.timestamp}
//     displayRelativeTime={!!displayRelativeTime}
//   />
// </Grid>
//   )
// );

export default List;

const Grid = styled('div')`
  max-height: 500px;
  overflow-y: auto;
  display: grid;
  > *:nth-last-child(5):before {
    bottom: calc(100% - ${space(1)});
  }
  grid-template-columns: max-content minmax(55px, 1fr) 6fr max-content 65px;
  @media (min-width: ${p => p.theme.breakpoints[0]}) {
    grid-template-columns: max-content minmax(132px, 1fr) 6fr max-content max-content;
  }
  ${aroundContentStyle}
`;

const StyledGridCell = styled(GridCell)`
  position: sticky;
  z-index: ${p => p.theme.zIndex.breadcrumbs.header};
  top: 0;
  border-bottom: 1px solid ${p => p.theme.borderDark};
  background: ${p => p.theme.gray100};
  color: ${p => p.theme.gray600};
  font-weight: 600;
  text-transform: uppercase;
  line-height: 1;
  font-size: ${p => p.theme.fontSizeExtraSmall};

  @media (min-width: ${p => p.theme.breakpoints[0]}) {
    padding: ${space(2)} ${space(2)};
    font-size: ${p => p.theme.fontSizeSmall};
  }
`;

const CategoryHeader = styled(StyledGridCell)`
  @media (min-width: ${p => p.theme.breakpoints[0]}) {
    padding-left: ${space(1)};
  }
`;
