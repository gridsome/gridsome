<template>
  <div class="footer">
    <span class="meta-data-1">{{ $static.metaData.myTest.value }}</span>
    <span class="meta-data-2">{{ $static.metaData.pluginValue }}</span>
  </div>
</template>

<static-query>
query Footer {
  metaData {
    myTest {
      value
    }
    pluginValue
  }
}
</static-query>
