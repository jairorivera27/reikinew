import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // Crear roles
  const roles = [
    { name: 'ADMIN', description: 'Administrador con acceso total' },
    { name: 'DIRECCION', description: 'Dirección con vista ejecutiva' },
    { name: 'COMERCIAL', description: 'Área comercial' },
    { name: 'MARKETING', description: 'Área de marketing' },
    { name: 'ADMINISTRATIVO', description: 'Área administrativa' },
  ];

  console.log('📝 Creando roles...');
  for (const roleData of roles) {
    const role = await prisma.role.upsert({
      where: { name: roleData.name },
      update: {},
      create: roleData,
    });
    console.log(`   ✅ Rol creado: ${role.name}`);
  }

  // Crear usuario administrador
  console.log('👤 Creando usuario administrador...');
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const adminRole = await prisma.role.findUnique({
    where: { name: 'ADMIN' },
  });

  if (!adminRole) {
    throw new Error('Rol ADMIN no encontrado');
  }

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@reikisolar.com.co' },
    update: {},
    create: {
      email: 'admin@reikisolar.com.co',
      password: hashedPassword,
      name: 'Administrador',
      isActive: true,
      roles: {
        create: {
          roleId: adminRole.id,
        },
      },
    },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  });

  console.log(`   ✅ Usuario creado: ${adminUser.email}`);

  // Crear usuarios por área
  console.log('');
  console.log('👥 Creando usuarios por área...');

  const usuarios = [
    {
      email: 'comercial@reikisolar.com.co',
      name: 'Usuario Comercial',
      password: 'comercial123',
      roleName: 'COMERCIAL',
    },
    {
      email: 'marketing@reikisolar.com.co',
      name: 'Usuario Marketing',
      password: 'marketing123',
      roleName: 'MARKETING',
    },
    {
      email: 'dir.admon@reikisolar.com.co',
      name: 'Director Administrativo',
      password: 'admin123',
      roleName: 'ADMINISTRATIVO',
    },
  ];

  for (const usuarioData of usuarios) {
    const role = await prisma.role.findUnique({
      where: { name: usuarioData.roleName },
    });

    if (!role) {
      console.log(`   ⚠️  Rol ${usuarioData.roleName} no encontrado, saltando usuario ${usuarioData.email}`);
      continue;
    }

    const hashedPassword = await bcrypt.hash(usuarioData.password, 10);

    const usuario = await prisma.user.upsert({
      where: { email: usuarioData.email },
      update: {},
      create: {
        email: usuarioData.email,
        password: hashedPassword,
        name: usuarioData.name,
        isActive: true,
        roles: {
          create: {
            roleId: role.id,
          },
        },
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    console.log(`   ✅ Usuario creado: ${usuario.email} (Rol: ${usuarioData.roleName})`);
  }

  console.log('');
  console.log('========================================');
  console.log('  CREDENCIALES DE ACCESO');
  console.log('========================================');
  console.log('ADMIN:');
  console.log('  Email: admin@reikisolar.com.co');
  console.log('  Contraseña: admin123');
  console.log('');
  console.log('COMERCIAL:');
  console.log('  Email: comercial@reikisolar.com.co');
  console.log('  Contraseña: comercial123');
  console.log('');
  console.log('MARKETING:');
  console.log('  Email: marketing@reikisolar.com.co');
  console.log('  Contraseña: marketing123');
  console.log('');
  console.log('ADMINISTRATIVO:');
  console.log('  Email: dir.admon@reikisolar.com.co');
  console.log('  Contraseña: admin123');
  console.log('========================================');
  console.log('');
  console.log('✅ Seed completado exitosamente!');
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


