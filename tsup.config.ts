import { defineConfig } from 'tsup'
import * as preset from 'tsup-preset-solid'

const preset_options: preset.PresetOptions = {
  entries: [
    {
      // entries with '.tsx' extension will have `solid` export condition generated
      entry: 'src/index.tsx',
      // will generate a separate development entry
      dev_entry: true,
    },
  ],
  // Set to `true` to remove all `console.log` calls and `debugger` statements in prod builds
  drop_console: true,
  // Set to `true` to generate a CommonJS build alongside ESM
  // cjs: true,
}

export default defineConfig(config => {
  const watching = !!config.watch
  const parsed_options = preset.parsePresetOptions(preset_options, watching)

  if (!watching) {
    const package_fields = preset.generatePackageExports(parsed_options)
    // Prints the "exports" map to paste into package.json when it changes
    console.log(`\npackage.json: \n${JSON.stringify(package_fields, null, 2)}\n\n`)
  }

  return preset.generateTsupOptions(parsed_options)
})
