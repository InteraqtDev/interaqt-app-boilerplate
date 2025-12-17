#!/usr/bin/env tsx
/**
 * Validate all integration workspaces
 * 
 * Checks:
 * 1. Each integration has a valid package.json
 * 2. Package names follow naming convention
 * 3. Required fields are present
 * 4. Dependencies are properly declared
 */

import { readdirSync, existsSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

interface PackageJson {
  name?: string
  version?: string
  description?: string
  type?: string
  main?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

const INTEGRATIONS_DIR = join(process.cwd(), 'integrations')
const REQUIRED_FIELDS = ['name', 'version', 'description', 'type', 'main']
const NAME_PREFIX = '@interaqt-integrations/'

interface ValidationResult {
  integration: string
  valid: boolean
  errors: string[]
  warnings: string[]
}

function validatePackageJson(integrationName: string, pkg: PackageJson): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    if (!pkg[field as keyof PackageJson]) {
      errors.push(`Missing required field: ${field}`)
    }
  }

  // Check name convention
  if (pkg.name && !pkg.name.startsWith(NAME_PREFIX)) {
    errors.push(`Package name should start with "${NAME_PREFIX}", got: ${pkg.name}`)
  }

  // Check type is module
  if (pkg.type !== 'module') {
    errors.push(`Package type should be "module", got: ${pkg.type}`)
  }

  // Check main file exists
  if (pkg.main) {
    const mainPath = join(INTEGRATIONS_DIR, integrationName, pkg.main)
    if (!existsSync(mainPath)) {
      errors.push(`Main file does not exist: ${pkg.main}`)
    }
  }

  // Check for interaqt peer dependency
  if (!pkg.peerDependencies?.['interaqt']) {
    warnings.push('Should declare "interaqt" as peerDependency')
  }

  // Check for duplicate dependencies in peer and regular
  if (pkg.peerDependencies && pkg.dependencies) {
    const duplicates = Object.keys(pkg.dependencies).filter(dep => 
      pkg.peerDependencies![dep]
    )
    if (duplicates.length > 0) {
      warnings.push(`Dependencies declared in both dependencies and peerDependencies: ${duplicates.join(', ')}`)
    }
  }

  return {
    integration: integrationName,
    valid: errors.length === 0,
    errors,
    warnings
  }
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

function main() {
  console.log('🔍 Validating integration workspaces...\n')

  const integrations = readdirSync(INTEGRATIONS_DIR)
    .filter(name => {
      const fullPath = join(INTEGRATIONS_DIR, name)
      return isDirectory(fullPath) && name !== 'docs'
    })

  const results: ValidationResult[] = []
  let totalErrors = 0
  let totalWarnings = 0

  for (const integration of integrations) {
    const pkgPath = join(INTEGRATIONS_DIR, integration, 'package.json')
    
    if (!existsSync(pkgPath)) {
      results.push({
        integration,
        valid: false,
        errors: ['Missing package.json'],
        warnings: []
      })
      totalErrors++
      continue
    }

    try {
      const pkgContent = readFileSync(pkgPath, 'utf-8')
      const pkg: PackageJson = JSON.parse(pkgContent)
      const result = validatePackageJson(integration, pkg)
      results.push(result)
      totalErrors += result.errors.length
      totalWarnings += result.warnings.length
    } catch (error: any) {
      results.push({
        integration,
        valid: false,
        errors: [`Failed to parse package.json: ${error.message}`],
        warnings: []
      })
      totalErrors++
    }
  }

  // Print results
  for (const result of results) {
    const icon = result.valid ? '✅' : '❌'
    console.log(`${icon} ${result.integration}`)
    
    if (result.errors.length > 0) {
      result.errors.forEach(err => console.log(`   🔴 ERROR: ${err}`))
    }
    
    if (result.warnings.length > 0) {
      result.warnings.forEach(warn => console.log(`   ⚠️  WARNING: ${warn}`))
    }
    
    console.log()
  }

  // Summary
  console.log('━'.repeat(60))
  console.log(`📊 Summary:`)
  console.log(`   Total integrations: ${results.length}`)
  console.log(`   Valid: ${results.filter(r => r.valid).length}`)
  console.log(`   Invalid: ${results.filter(r => !r.valid).length}`)
  console.log(`   Total errors: ${totalErrors}`)
  console.log(`   Total warnings: ${totalWarnings}`)
  console.log('━'.repeat(60))

  if (totalErrors > 0) {
    console.log('\n❌ Validation failed! Please fix the errors above.')
    process.exit(1)
  } else if (totalWarnings > 0) {
    console.log('\n⚠️  Validation passed with warnings.')
    process.exit(0)
  } else {
    console.log('\n✅ All integrations are valid!')
    process.exit(0)
  }
}

main()


