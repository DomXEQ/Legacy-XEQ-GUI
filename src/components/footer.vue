<template>
  <q-footer class="status-footer">
    <div class="status-line row items-center">
      <div class="status row items-center">
        <span>{{ $t("footer.status") }}:</span>
        <span v-if="isRefreshing" class="status-text syncing">
          {{ wallet.status.message }}
        </span>
        <span v-else class="status-text" :class="[status]">{{
          $t(`footer.${status}`)
        }}</span>
      </div>
      <div class="row">
        <template v-if="config_daemon.type !== 'remote'">
          <div>
            Daemon: {{ daemon.info.height_without_bootstrap }} /
            {{ target_height }} ({{ daemon_local_pct }}%)
          </div>
        </template>

        <template v-if="config_daemon.type !== 'local'">
          <div>{{ $t("footer.remote") }}: {{ daemon.info.height }}</div>
        </template>

        <div>
          {{ $t("footer.wallet") }}: {{ wallet.info.height }} /
          {{ target_height }} ({{ wallet_pct }}%)
        </div>
      </div>
    </div>
    <div class="status-bars" :class="[status]">
      <div :style="{ width: daemon_pct + '%' }"></div>
      <div :style="{ width: wallet_pct + '%' }"></div>
    </div>
  </q-footer>
</template>

<script>
import { mapState } from "vuex";

export default {
  name: "StatusFooter",
  data() {
    return {};
  },
  computed: mapState({
    config: state => state.gateway.app.config,
    daemon: state => state.gateway.daemon,
    wallet: state => state.gateway.wallet,
    update_required: state => state.gateway.update_required,

    config_daemon() {
      return this.config.daemons[this.config.app.net_type];
    },
    target_height() {
      if (this.config_daemon.type === "local")
        return Math.max(
          this.daemon.info.height,
          this.daemon.info.target_height
        );
      else return this.daemon.info.height;
    },
    daemon_pct() {
      if (this.config_daemon.type === "local") return this.daemon_local_pct;
      return 0;
    },
    daemon_local_pct() {
      if (this.config_daemon.type === "remote") return 0;
      let pct = (
        (100 * this.daemon.info.height_without_bootstrap) /
        this.target_height
      ).toFixed(1);
      if (
        pct == 100.0 &&
        this.daemon.info.height_without_bootstrap < this.target_height
      )
        return 99.9;
      else return pct;
    },
    wallet_pct() {
      let pct = ((100 * this.wallet.info.height) / this.target_height).toFixed(
        1
      );
      if (pct == 100.0 && this.wallet.info.height < this.target_height)
        return 99.9;
      else return pct;
    },
    isRefreshing() {
      const msg = this.wallet.status.message;
      return (
        msg &&
        msg !== "OK" &&
        (msg.toLowerCase().includes("refreshing") ||
          msg.toLowerCase().includes("syncing wallet"))
      );
    },
    status() {
      if (this.isRefreshing) return "syncing";

      // Check if wallet is fully synced (at 100%)
      const walletIsFullySynced =
        this.wallet.info.height >= this.target_height - 1;
      const walletPctNum = parseFloat(this.wallet_pct);

      // Priority: Show sync status based on wallet sync percentage
      // If wallet is at 100%, show READY
      // If wallet is under 100%, show SYNCING
      if (walletIsFullySynced || walletPctNum >= 100) {
        return "ready";
      } else {
        // Wallet is syncing (under 100%)
        return "syncing";
      }
    }
  })
};
</script>

<style lang="scss"></style>
