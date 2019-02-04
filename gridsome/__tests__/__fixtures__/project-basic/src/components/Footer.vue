<template>
  <div class="footer">
    <span>{{ $static.metaData.myTest.value }}</span>
    <span>{{ $static.metaData.pluginValue }}</span>
  </div>
</template>

<static-query>
query Home {
  metaData {
    myTest {
      value
    }
    pluginValue
  }
}
</static-query>
