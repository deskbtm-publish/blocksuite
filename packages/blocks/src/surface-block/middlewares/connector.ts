import type { EdgelessModel } from '../../page-block/edgeless/type.js';
import type { ConnectorElementModel } from '../index.js';
import { ConnectorPathGenerator } from '../managers/connector-manager.js';
import type { SurfaceBlockModel } from '../surface-model.js';

export function connectorMiddleware(surface: SurfaceBlockModel) {
  const getElementById = (id: string) =>
    surface.getElementById(id) ??
    (surface.page.getBlockById(id) as EdgelessModel);
  const pathGenerator = new ConnectorPathGenerator({
    getElementById: getElementById,
  });
  const updateConnectorPath = (connector: ConnectorElementModel) => {
    if (
      ((connector.source?.id && getElementById(connector.source.id)) ||
        connector.source?.position) &&
      ((connector.target?.id && getElementById(connector.target.id)) ||
        connector.target?.position)
    ) {
      pathGenerator.updatePath(connector);
    }
  };
  const pendingList = new Set<ConnectorElementModel>();
  let pendingFlag = false;
  const addToUpdateList = (connector: ConnectorElementModel) => {
    pendingList.add(connector);

    if (!pendingFlag) {
      pendingFlag = true;
      queueMicrotask(() => {
        pendingList.forEach(updateConnectorPath);
        pendingList.clear();
        pendingFlag = false;
      });
    }
  };

  const disposables = [
    surface.elementAdded.on(({ id }) => {
      const element = getElementById(id);

      if (!element) return;

      if ('type' in element && element.type === 'connector') {
        addToUpdateList(element as ConnectorElementModel);
      } else {
        surface.getConnectors(id).forEach(addToUpdateList);
      }
    }),
    surface.elementUpdated.on(({ id, props }) => {
      const element = getElementById(id);

      if (props['xywh'] || props['rotate']) {
        surface.getConnectors(id).forEach(addToUpdateList);
      }

      if (
        'type' in element &&
        element.type === 'connector' &&
        (props['target'] ||
          props['source'] ||
          (props['xywh'] && !(element as ConnectorElementModel).updatingPath))
      ) {
        addToUpdateList(element as ConnectorElementModel);
      }
    }),
    surface.page.slots.blockUpdated.on(payload => {
      if (payload.type === 'update' && payload.props.key === 'xywh') {
        surface.getConnectors(payload.id).forEach(addToUpdateList);
      }
    }),
  ];

  surface
    .getElementsByType('connector')
    .forEach(connector =>
      updateConnectorPath(connector as ConnectorElementModel)
    );

  return () => {
    disposables.forEach(d => d.dispose());
  };
}
