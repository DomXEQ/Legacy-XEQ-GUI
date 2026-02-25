<template>
  <q-page padding class="created">
    <div class="col wallet q-mb-lg">
      <h6>{{ walletName }}</h6>
      <div class="row items-center">
        <div class="col address">
          {{ info.address }}
        </div>
        <div class="q-item-side">
          <q-btn
            color="primary"
            padding="xs"
            size="sm"
            icon="file_copy"
            @click="copyAddress"
          >
            <q-tooltip
              anchor="center left"
              self="center right"
              :offset="[5, 10]"
            >
              {{ $t("menuItems.copyAddress") }}
            </q-tooltip>
          </q-btn>
        </div>
      </div>
    </div>

    <template v-if="secret.mnemonic">
      <div class="seed-box col">
        <div
          class="seed-warning-banner"
          style="
          background: rgba(255, 60, 60, 0.1);
          border: 2px solid rgba(255, 60, 60, 0.5);
          border-radius: 8px;
          padding: 16px;
          margin-top: 16px;
          margin-bottom: 12px;
          text-align: center;
        "
        >
          <div
            style="font-size: 18px; font-weight: 700; color: #ff4444; margin-bottom: 8px;"
          >
            ⚠ WRITE DOWN YOUR SEED WORDS ⚠
          </div>
          <div
            style="font-size: 13px; color: rgba(255,255,255,0.8); line-height: 1.6;"
          >
            These 25 words are the ONLY way to recover your wallet if you lose
            access.<br />
            <strong style="color: #ff4444;"
              >If you lose these words, your funds are gone forever. No one can
              help you.</strong
            ><br />
            Write them down on paper and store them somewhere safe. Do NOT
            screenshot or save digitally.
          </div>
        </div>

        <h6 class="q-mb-xs">{{ $t("strings.seedWords") }}</h6>
        <div class="seed q-my-lg">
          {{ secret.mnemonic }}
        </div>
        <div>
          <q-btn
            color="primary"
            size="md"
            icon="file_copy"
            label="Copy seed words"
            @click="copyPrivateKey('mnemonic', $event)"
          />
        </div>

        <div style="margin-top: 20px;">
          <q-checkbox
            v-model="seedSaved"
            label="I have saved my seed words in a safe place"
            color="positive"
            style="color: rgba(255,255,255,0.8);"
          />
        </div>
      </div>
    </template>

    <q-expansion-item
      label="Advanced"
      header-class="q-mt-sm non-selectable row reverse advanced-options-label"
    >
      <template v-if="secret.view_key != secret.spend_key">
        <h6 class="q-mb-xs title">{{ $t("strings.viewKey") }}</h6>
        <div class="row">
          <div class="col" style="word-break:break-all;">
            {{ secret.view_key }}
          </div>
          <div class="q-item-side">
            <q-btn
              color="primary"
              padding="xs"
              size="sm"
              icon="file_copy"
              @click="copyPrivateKey('view_key', $event)"
            >
              <q-tooltip
                anchor="center left"
                self="center right"
                :offset="[5, 10]"
              >
                {{ $t("menuItems.copyViewKey") }}
              </q-tooltip>
            </q-btn>
          </div>
        </div>
      </template>

      <template v-if="!/^0*$/.test(secret.spend_key)">
        <h6 class="q-mb-xs title">{{ $t("strings.spendKey") }}</h6>
        <div class="row">
          <div class="col" style="word-break:break-all;">
            {{ secret.spend_key }}
          </div>
          <div class="q-item-side">
            <q-btn
              color="primary"
              padding="xs"
              size="sm"
              icon="file_copy"
              @click="copyPrivateKey('spend_key', $event)"
            >
              <q-tooltip
                anchor="center left"
                self="center right"
                :offset="[5, 10]"
              >
                {{ $t("menuItems.copySpendKey") }}
              </q-tooltip>
            </q-btn>
          </div>
        </div>
      </template>
    </q-expansion-item>

    <q-btn
      class="q-mt-lg"
      color="primary"
      :disable="!seedSaved && !!secret.mnemonic"
      :label="
        seedSaved || !secret.mnemonic
          ? $t('buttons.openWallet')
          : 'Confirm seed saved to continue'
      "
      @click="open"
    />
  </q-page>
</template>

<script>
import { mapState } from "vuex";
export default {
  data() {
    return {
      seedSaved: false
    };
  },
  computed: mapState({
    info: state => state.gateway.wallet.info,
    secret: state => state.gateway.wallet.secret,
    theme: state => state.gateway.app.config.appearance.theme,
    walletName() {
      return `Wallet: ${this.info.name}`;
    }
  }),
  methods: {
    open() {
      setTimeout(() => {
        this.$store.commit("gateway/set_wallet_data", {
          secret: {
            mnemonic: "",
            spend_key: "",
            view_key: ""
          }
        });
      }, 500);
      this.$router.replace({ path: "/wallet" });
    },
    copyPrivateKey(type, event) {
      event.stopPropagation();
      const path = event.composedPath ? event.composedPath() : event.path || [];
      for (let i = 0; i < path.length; i++) {
        if (path[i].tagName == "BUTTON") {
          path[i].blur();
          break;
        }
      }

      if (this.secret[type] == null) {
        this.$q.notify({
          type: "negative",
          timeout: 1000,
          message: this.$t("notification.errors.copyingPrivateKeys")
        });
        return;
      }

      window.electronAPI.copyToClipboard(this.secret[type]);

      let type_key = "seedWords";
      if (type === "spend_key") {
        type_key = "spendKey";
      } else if (type === "view_key") {
        type_key = "viewKey";
      }
      const type_title = this.$t("dialog.copyPrivateKeys." + type_key);

      this.$q
        .dialog({
          title: this.$t("dialog.copyPrivateKeys.title", {
            type: type_title
          }),
          message: this.$t("dialog.copyPrivateKeys.message"),
          ok: {
            label: this.$t("dialog.buttons.ok"),
            color: "primary"
          }
        })
        .onDismiss(() => null)
        .onCancel(() => null)
        .onOk(() => {
          this.$q.notify({
            type: "positive",
            timeout: 1000,
            message: this.$t("notification.positive.copied", {
              item: this.$t("strings." + type_key)
            })
          });
        });
    },
    copyAddress() {
      window.electronAPI.copyToClipboard(this.info.address);
      this.$q.notify({
        type: "positive",
        timeout: 1000,
        message: this.$t("notification.positive.addressCopied"),
        dark: this.theme == "dark"
      });
    }
  }
};
</script>

<style lang="scss"></style>
