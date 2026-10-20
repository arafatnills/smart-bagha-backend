import bcrypt from "bcryptjs";
import config from "../config";
import { UserRole } from "../generated/prisma/enums";
import { prisma } from "../lib/prisma";

// tester admin
export const seedTesterAdmin = async () => {
  try {
    const isTesterAdminExist = await prisma.user.findUnique({
      where: {
        email: config.tester_admin_email,
      },
    });

    if (isTesterAdminExist) {
      console.log("Tester Admin Already Exists!");
      return;
    }
    const name = config.tester_admin_name;
    const email = config.tester_admin_email;
    const password = config.tester_admin_password;

    if (!name || !email || !password) {
      throw new Error(
        "Tester Admin Name , Email, Password Missing In Env File!!!",
      );
    }

    const hashedPassword = await bcrypt.hash(
      password,
      Number(config.bcrypt_salt_rounds),
    );
    const testerAdmin = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        emailVerified: true,
        role: UserRole.ADMIN,
        bloodGroup: "",
        phone: "",
        admin: {
          create: {
            name,
            email,
            phone: "01700000000",
            address: "Dhaka, Bangladesh",
          },
        },
      },
    });
    console.log("Tester Admin Created : ", testerAdmin);
  } catch (error) {
    console.log("Error Seeding Super Admin : ", error);

    await prisma.user.delete({
      where: {
        email: config.tester_admin_email,
      },
    });
  }
};

// tester donar
export const seedTesterDonar = async () => {
  try {
    const isTesterDonarExist = await prisma.user.findUnique({
      where: {
        email: config.tester_donar_email,
      },
    });

    if (isTesterDonarExist) {
      console.log("Tester Donar Already Exists!");
      return;
    }

    const name = config.tester_donar_name;
    const email = config.tester_donar_email;
    const password = config.tester_donar_password;

    if (!name || !email || !password) {
      throw new Error(
        "Tester Donar Name , Email, Password Missing In Env File!!!",
      );
    }

    const hashedPassword = await bcrypt.hash(
      password,
      Number(config.bcrypt_salt_rounds),
    );

    const testerDonar = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        emailVerified: true,
        role: UserRole.DONOR,
        phone: "",
        bloodGroup: "",
        donar: {
          create: {
            name,
            email,
          },
        },
      },
    });

    console.log("Tester Donar Created : ", testerDonar);
  } catch (error) {
    console.log("Error Seeding Tester Donar : ", error);

    await prisma.user.delete({
      where: {
        email: config.tester_donar_email,
      },
    });
  }
};
