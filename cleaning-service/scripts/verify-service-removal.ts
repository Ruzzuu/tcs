// ============================================
// VERIFY SERVICE REMOVAL - CHECK CLEANUP SUCCESS
// ============================================

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { exec } from 'child_process';
import { promisify } from 'util';
import connectDB from '../src/lib/mongodb';
import Order from '../src/lib/models/Order';
import { SERVICES } from '../src/lib/services';
import { ServiceType } from '../src/types';

const execAsync = promisify(exec);

// Services that should be deleted
const DELETED_SERVICES = [
  'tas_gunung',
  'helm',
  'topi',
  'whitening',
  'repaint_canvas',
  'repaint_leather',
  'repaint_suede',
  'other'
] as const;

async function verifyServiceRemoval() {
  const startTime = Date.now();

  try {
    console.log('🔍 Verifying service removal...\n');

    await connectDB();
    console.log('✅ Connected to database\n');

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check 1: Database - itemType
    console.log('📊 Check 1: Database itemType references...');
    const itemTypeStats = await Order.aggregate([
      {
        $match: {
          itemType: { $in: DELETED_SERVICES },
          deleted: { $ne: true }
        }
      },
      {
        $group: {
          _id: '$itemType',
          count: { $sum: 1 }
        }
      }
    ]);

    if (itemTypeStats.length > 0) {
      itemTypeStats.forEach((stat: any) => {
        errors.push(`Found ${stat.count} orders with itemType = '${stat._id}'`);
      });
    } else {
      console.log('   ✅ No itemType references found\n');
    }

    // Check 2: Database - items.serviceType
    console.log('📊 Check 2: Database items.serviceType references...');
    const itemsServiceStats = await Order.aggregate([
      { $match: { deleted: { $ne: true } } },
      { $unwind: '$items' },
      {
        $match: {
          'items.serviceType': { $in: DELETED_SERVICES }
        }
      },
      {
        $group: {
          _id: '$items.serviceType',
          count: { $sum: 1 }
        }
      }
    ]);

    if (itemsServiceStats.length > 0) {
      itemsServiceStats.forEach((stat: any) => {
        errors.push(`Found ${stat.count} items with serviceType = '${stat._id}'`);
      });
    } else {
      console.log('   ✅ No items.serviceType references found\n');
    }

    // Check 3: SERVICES object
    console.log('📊 Check 3: SERVICES object...');
    const deletedServicesInConfig = DELETED_SERVICES.filter(service => SERVICES[service as ServiceType]);

    if (deletedServicesInConfig.length > 0) {
      deletedServicesInConfig.forEach(service => {
        errors.push(`Found '${service}' in SERVICES object`);
      });
    } else {
      console.log('   ✅ No deleted services in SERVICES object\n');
    }

    // Check 4: Code references (grep)
    console.log('📊 Check 4: Code file references...');

    const grepPatterns = [
      `tas_gunung|'tas_gunung'|"tas_gunung"`,
      `itemType === 'other'|itemType === "other"|itemType===\\'other\\'`,
      `whitening|'whitening'|"whitening"`,
      `repaint_canvas|'repaint_canvas'|"repaint_canvas"`,
      `repaint_leather|'repaint_leather'|"repaint_leather"`,
      `repaint_suede|'repaint_suede'|"repaint_suede"`
    ];

    for (const pattern of grepPatterns) {
      try {
        const { stdout } = await execAsync(
          `cd "${process.cwd()}/src" && grep -r "${pattern}" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . || true`
        );

        if (stdout.trim()) {
          const lines = stdout.split('\n').filter(line => line.trim());
          lines.forEach((line: string) => {
            // Exclude comments and TypeScript definitions
            if (!line.includes('//') && !line.includes('*')) {
              warnings.push(`Code reference: ${line}`);
            }
          });
        }
      } catch (error) {
        // grep returns non-zero when no matches found - this is expected
      }
    }

    if (warnings.length > 0) {
      console.log(`   ⚠️  Found ${warnings.length} potential code references`);
      warnings.slice(0, 10).forEach(w => console.log(`      ${w}`));
      if (warnings.length > 10) {
        console.log(`      ... and ${warnings.length - 10} more`);
      }
    } else {
      console.log('   ✅ No code references found\n');
    }

    // Check 5: Type definitions
    console.log('📊 Check 5: Type definitions...');
    const typesFile = `${process.cwd()}/src/types/index.ts`;
    const { stdout: typesContent } = await execAsync(`cat "${typesFile}"`);

    DELETED_SERVICES.forEach(service => {
      if (typesContent.includes(`| '${service}'`) || typesContent.includes(`| "${service}"`)) {
        errors.push(`Found '${service}' in ServiceType type definition`);
      }
    });

    if (!errors.some(e => e.includes('ServiceType'))) {
      console.log('   ✅ No deleted services in ServiceType type\n');
    }

    // Check 6: Model enums
    console.log('📊 Check 6: Database model enums...');
    const modelFile = `${process.cwd()}/src/lib/models/Order.ts`;
    const { stdout: modelContent } = await execAsync(`cat "${modelFile}"`);

    DELETED_SERVICES.forEach(service => {
      if (modelContent.includes(`'${service}'`) || modelContent.includes(`"${service}"`)) {
        errors.push(`Found '${service}' in Order model enum`);
      }
    });

    if (!errors.some(e => e.includes('Order model'))) {
      console.log('   ✅ No deleted services in Order model\n');
    }

    // Final summary
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('╔══════════════════════════════════════════╗');
    console.log('║          VERIFICATION SUMMARY              ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log(`   Duration: ${duration}s`);
    console.log(`   Errors: ${errors.length}`);
    console.log(`   Warnings: ${warnings.length}\n`);

    if (errors.length > 0) {
      console.log('❌ VERIFICATION FAILED');
      console.log('\nErrors found:');
      errors.forEach(error => console.log(`   ❌ ${error}`));
      console.log();
      process.exit(1);
    }

    if (warnings.length > 0) {
      console.log('⚠️  VERIFICATION COMPLETED WITH WARNINGS');
      console.log('\nWarnings:');
      warnings.forEach(warning => console.log(`   ⚠️  ${warning}`));
      console.log();
    }

    console.log('✅ VERIFICATION PASSED');
    console.log('\nAll checks completed successfully:');
    console.log('   ✅ No database references to deleted services');
    console.log('   ✅ No deleted services in configuration');
    console.log('   ✅ Type definitions updated');
    console.log('   ✅ Database model updated');
    console.log('   ✅ Code cleanup complete');
    console.log('\n✨ Service removal verified successfully!\n');

    process.exit(0);

  } catch (error) {
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.error('\n❌ Verification failed!');
    console.error(`   Duration: ${duration}s`);
    console.error(`   Error:`, error);

    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
    }

    process.exit(1);
  }
}

verifyServiceRemoval();
