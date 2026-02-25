<template>
  <q-list class="ons-record-list">
    <q-item
      v-for="record in recordList"
      :key="record.name_hash"
      class="oxen-list-item"
    >
      <q-item-section class="type" avatar>
        <q-icon :name="isLocked(record) ? 'lock' : 'lock_open'" size="24px" />
      </q-item-section>
      <q-item-section>
        <q-item-label :class="bindClass(record)">{{
          isLocked(record) ? record.name_hash : record.name
        }}</q-item-label>
        <q-item-label v-if="!isLocked(record)" class="truncate-item">{{
          record.value
        }}</q-item-label>
      </q-item-section>
      <q-item-section side class="height">
        <template v-if="isLocked(record)">{{
          formatBlockHeight(record.update_height)
        }}</template>
        <template v-else>
          <q-item-section>
            <div class="row update-renew-buttons">
              <q-btn
                color="primary"
                :label="$t('buttons.update')"
                @click="onUpdate(record)"
              />
              <q-btn
                v-if="isLokinet"
                color="primary"
                :label="$t('buttons.renew')"
                @click="onRenew(record)"
              />
            </div>
          </q-item-section>
        </template>
      </q-item-section>
      <q-item-section v-if="!isLocked(record)" side>
        <span v-if="record.type === 'session' || record.type === 'wallet'">{{
          formatBlockHeight(record.update_height)
        }}</span>
        <span v-else class="lokinet-expiration">{{
          formatExpirationHeight(record.expiration_height)
        }}</span>
      </q-item-section>
      <ContextMenu
        :menu-items="validMenuItems(record)"
        @ownerCopy="copy(record.owner, $t('notification.positive.ownerCopied'))"
        @nameCopy="copy(record.name, $t('notification.positive.nameCopied'))"
        @copyValue="copyValue(record)"
        @backupOwnerCopy="
          copy(
            record.backup_owner,
            $t('notification.positive.backupOwnerCopied')
          )
        "
      />
    </q-item>
  </q-list>
</template>

<script>
import { mapState } from "vuex";
import ContextMenu from "components/menus/contextmenu";

export default {
  name: "ONSRecordList",
  components: {
    ContextMenu
  },
  props: {
    recordList: {
      type: Array,
      required: true
    },
    isLokinet: {
      type: Boolean,
      required: true
    }
  },
  computed: mapState({
    theme: state => state.gateway.app.config.appearance.theme
  }),
  methods: {
    formatBlockHeight(value) {
      return `${this.$t("strings.blockHeight")}: ${value}`;
    },
    formatExpirationHeight(value) {
      return `${this.$t("strings.expirationHeight")}: ${value}`;
    },
    isLocked(record) {
      return !record.name || !record.value;
    },
    bindClass(record) {
      return [this.isLocked(record) ? "locked" : "unlocked"];
    },
    onUpdate(record) {
      this.$emit("onUpdate", record);
    },
    onRenew(record) {
      this.$emit("onRenew", record);
    },
    copyNameI18nLabel(record) {
      if (record.type === "session" || record.type === "wallet") {
        return "menuItems.copyName";
      } else {
        return "menuItems.copyLokinetName";
      }
    },
    copyValueI18nLabel(record) {
      if (record.type === "session") {
        return "menuItems.copySessionId";
      } else if (record.type === "lokinet") {
        return "menuItems.copyLokinetAddress";
      }
      return "menuItems.copyAddress";
    },
    validMenuItems(record) {
      // change name depending on if lokinet or session
      const lockedItems = [
        { action: "nameCopy", i18n: this.copyNameI18nLabel(record) },
        { action: "copyValue", i18n: this.copyValueI18nLabel(record) }
      ];
      let menuItems = [{ action: "ownerCopy", i18n: "menuItems.copyOwner" }];
      const backupOwnerItem = [
        { action: "backupOwnerCopy", i18n: "menuItems.copyBackupOwner" }
      ];
      if (!this.isLocked(record)) {
        menuItems = [...lockedItems, ...menuItems];
      }
      if (record.backup_owner !== "") {
        menuItems = [...menuItems, ...backupOwnerItem];
      }
      return menuItems;
    },
    // can copy a value on unlock
    copyValue(record) {
      let message = this.$t("notification.positive.lokinetAddressCopied");
      if (record.type === "session") {
        message = this.$t("notification.positive.sessionIdCopied");
      }
      if (record.type === "wallet") {
        message = this.$t("notification.positive.walletCopied");
      }
      this.copy(record.value, message);
    },
    copy(value, message) {
      if (!value) return;
      window.electronAPI.copyToClipboard(value.trim());
      this.$q.notify({
        type: "positive",
        timeout: 2000,
        message
      });
    }
  }
};
</script>

<style lang="scss"></style>
