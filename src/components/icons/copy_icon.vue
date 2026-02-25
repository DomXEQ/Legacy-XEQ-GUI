<template>
  <q-btn ref="copy" color="primary" size="sm" padding="xs" icon="file_copy" @click="copyContent">
    <q-tooltip anchor="center right" self="center left" :offset="[5, 10]">
      {{ $t("menuItems.copyAddress") }}
    </q-tooltip>
  </q-btn>
</template>

<script>
export default {
  name: "CopyIcon",
  props: {
    content: {
      type: String,
      required: true
    },
    event: {
      type: Event,
      required: false,
      default: null
    }
  },
  methods: {
    copyContent() {
      window.electronAPI.copyToClipboard(this.content);
      this.$q.notify({
        type: "positive",
        timeout: 1000,
        message: this.$t("notification.positive.addressCopied")
      });
    }
  }
};
</script>

<style></style>
