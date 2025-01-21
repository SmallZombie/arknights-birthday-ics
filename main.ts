import { join } from '@std/path';
import { timeout, Vcalendar, VcalendarBuilder } from './src/BaseUtil.ts';
import { getAllCharacters, getCharacterDetail } from './src/WikiController.ts';
import { ReleaseJsonType } from './src/type/ReleaseJsonType.ts';
import { UID_PREFIX } from './src/Const.ts';
import { existsSync } from "@std/fs/exists";


const icsPath = join(Deno.cwd(), 'release.ics');
function getICS(): Vcalendar {
    if (existsSync(icsPath)) {
        return Vcalendar.fromString(Deno.readTextFileSync(icsPath));
    } else {
        const builder = new VcalendarBuilder();
        const vcalendar: Vcalendar = builder
            .setVersion('2.0')
            .setProdId('-//SmallZombie//ARKNIGHTS Birthday ICS//ZH')
            .setName('明日方舟干员生日')
            .setRefreshInterval('P1D')
            .setCalScale('GREGORIAN')
            .setTzid('Asia/Shanghai')
            .setTzoffset('+0800')
            .build();
        return vcalendar;
    }
}

async function main() {
    const ics = getICS();
    const json: ReleaseJsonType = [];
    const characters = await getAllCharacters();

    let needSaveICS = false;
    console.log('[!] Total Characters: ', characters.length);
    for (let i = 0; i < characters.length; i++) {
        const item = characters[i];
        const { birthday, release } = await getCharacterDetail(item.name);

        const dtstart = `${release.getFullYear()}${String(release.getMonth() + 1).padStart(2, '0')}${String(release.getDate()).padStart(2, '0')}`;
        const rrule = birthday ? `FREQ=YEARLY;BYMONTH=${String(birthday.getMonth() + 1).padStart(2, '0')};BYMONTHDAY=${String(birthday.getDate()).padStart(2, '0')}` : '';

        let needSaveICSInThisCycle = false;
        let icsItem = ics.items.find(v => v.uid === UID_PREFIX + item.id);
        if (icsItem) {
            // 如果之前有现在没有
            if (!birthday) {
                ics.items.splice(ics.items.indexOf(icsItem), 1);
                needSaveICSInThisCycle = true;
            }
            // 如果不同
            if (icsItem.dtstart !== dtstart || icsItem.rrule !== rrule) {
                icsItem.dtstart = dtstart;
                icsItem.rrule = rrule;
                needSaveICSInThisCycle = true;
            }
        } else if (birthday) {
            icsItem = {
                uid: UID_PREFIX + item.id,
                dtstamp: ics.dateToDateTime(new Date()),
                dtstart,
                rrule,
                summary: item.name + ' 生日'
            }
            ics.items.push(icsItem);
            needSaveICSInThisCycle = true;
        }
        if (needSaveICSInThisCycle) {
            console.log(`${i + 1}/${characters.length} Update "${item.name}"(${item.id}) in ICS`);

            icsItem!.dtstamp = ics.dateToDateTime(new Date());
            needSaveICS = true;
        }

        json.push({
            id: item.id,
            name: item.name,
            birthday: birthday ? {
                month: birthday.getMonth() + 1,
                day: birthday.getDate()
            } : void 0,
            release: release.toISOString()
        });

        await timeout(200);
    }

    if (needSaveICS) {
        const icsSavePath = join(Deno.cwd(), 'release.ics');
        Deno.writeTextFileSync(icsSavePath, ics.toString());
        console.log(`[√] ICS Has Save To "${icsSavePath}"`);
    } else {
        console.log('[-] No need to save ICS');
    }

    const jsonSavePath = join(Deno.cwd(), 'release.json');
    Deno.writeTextFileSync(jsonSavePath, JSON.stringify(json, null, 4));
    console.log(`[√] JSON Has Save To "${jsonSavePath}"`);
}
main();
