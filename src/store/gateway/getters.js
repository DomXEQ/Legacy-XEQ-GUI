export const isReady = state => {
  const { daemons, app } = state.app.config;
  const config_daemon = daemons[app.net_type];

  let target_height;
  if (config_daemon.type === "local") {
    target_height = Math.max(
      state.daemon.info.height,
      state.daemon.info.target_height
    );
  } else {
    target_height = state.daemon.info.height;
  }

  return state.wallet.info.height >= target_height - 1;
};

export const isAbleToSend = state => {
  const { daemons, app } = state.app.config;
  const config_daemon = daemons[app.net_type];

  let target_height;
  if (config_daemon.type === "local") {
    target_height = Math.max(
      state.daemon.info.height,
      state.daemon.info.target_height
    );
  } else {
    target_height = state.daemon.info.height;
  }

  return state.wallet.info.height >= target_height - 1;
};
