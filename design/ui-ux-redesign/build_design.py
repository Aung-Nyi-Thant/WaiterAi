"""Build reviewable SVG UI drawings; imports do not alter the application."""
from pathlib import Path
from html import escape
import base64, json, re
import fitz
import CoreText as CT
import Quartz as Q
from Foundation import NSAttributedString

def shaped_native(text,x,y,size,color):
 family='Noto Sans Myanmar' if any('\u1000'<=ch<='\u109f' for ch in text) else 'Thonburi'
 font=CT.CTFontCreateWithName(family,size,None)
 line=CT.CTLineCreateWithAttributedString(NSAttributedString.alloc().initWithString_attributes_(text,{CT.kCTFontAttributeName:font}))
 result=[]
 for run in CT.CTLineGetGlyphRuns(line):
  count=CT.CTRunGetGlyphCount(run)
  glyphs=CT.CTRunGetGlyphs(run,(0,count),None);positions=CT.CTRunGetPositions(run,(0,count),None)
  actual=CT.CTRunGetAttributes(run).get(CT.kCTFontAttributeName,font)
  for glyph,pos in zip(glyphs,positions):
   path=CT.CTFontCreatePathForGlyph(actual,glyph,None)
   if path is None:continue
   commands=[]
   def cb(info,e):
    n={0:1,1:1,2:2,3:3,4:0}[e.type]
    pts=[f'{x+pos.x+e.points[i].x:.3f} {y-pos.y-e.points[i].y:.3f}' for i in range(n)]
    commands.append({0:'M',1:'L',2:'Q',3:'C',4:'Z'}[e.type]+' '.join(pts))
   Q.CGPathApply(path,None,cb)
   result.append('<path d="'+''.join(commands)+'" fill="'+color+'"/>')
 return '<g aria-label="'+escape(text)+'"><title>'+escape(text)+'</title>'+''.join(result)+'</g>'

ROOT=Path(__file__).parent
C={'bg':'#F5F5F5','white':'#FFFFFF','ink':'#141414','muted':'#626262','green':'#151515','pale':'#EAEAEA','line':'#DEDEDE','red':'#242424','rose':'#EEEEEE','amber':'#303030','sand':'#E8E8E8','dark':'#111111'}
B='Helvetica Neue, Arial, sans-serif'; D=B
class Canvas:
 def __init__(self,w,h,key): self.w=w;self.h=h;self.key=key;self.parts=[];self.n=0;self.rect(0,0,w,h,C['bg'])
 def rect(self,x,y,w,h,fill,rx=0,stroke=None,sw=1):
  self.parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}"'+(f' stroke="{stroke}" stroke-width="{sw}"' if stroke else '')+'/>')
 def text(self,x,y,s,size=16,color=None,weight=400,font=B,anchor='start'):
  if any('\u0e00'<=ch<='\u0e7f' or '\u1000'<=ch<='\u109f' for ch in str(s)):
   self.parts.append(shaped_native(str(s),x,y,size,color or C['ink']));return
  self.parts.append(f'<text x="{x}" y="{y}" font-family="{font}" font-size="{size}" font-weight="{weight}" letter-spacing="{-.025*size if size>=24 else 0}" fill="{color or C["ink"]}" text-anchor="{anchor}">{escape(str(s))}</text>')
 def lines(self,x,y,ss,size=16,color=None,weight=400,gap=None,font=B):
  for i,s in enumerate(ss):self.text(x,y+i*(gap or size*1.5),s,size,color,weight,font)
 def line(self,x,y,x2,y2,color=None,sw=1):self.parts.append(f'<path d="M{x} {y} L{x2} {y2}" fill="none" stroke="{color or C["line"]}" stroke-width="{sw}"/>')
 def circle(self,x,y,r,fill,stroke=None):self.parts.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}"'+(f' stroke="{stroke}"' if stroke else '')+'/>')
 def icon(self,name,x,y,color=None,size=20):
  p={'search':'<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>','plus':'<path d="M12 5v14M5 12h14"/>','minus':'<path d="M5 12h14"/>','back':'<path d="m14 5-7 7 7 7"/>','next':'<path d="m9 5 7 7-7 7"/>','down':'<path d="m6 9 6 6 6-6"/>','close':'<path d="m6 6 12 12M18 6 6 18"/>','check':'<path d="m5 12 4 4L19 6"/>','chat':'<path d="M4 4h16v12H9l-5 4z"/><path d="M8 8h8M8 12h5"/>','menu':'<path d="M5 5h14v15H5zM8 9h8M8 13h8M8 17h4"/>','bag':'<path d="M5 8h14l1 13H4zM9 8V6a3 3 0 0 1 6 0v2"/>','bell':'<path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5zM10 21h4"/>','heart':'<path d="M12 20 4 12a5 5 0 0 1 8-6 5 5 0 0 1 8 6z"/>','arrow':'<path d="M5 12h14m-6-6 6 6-6 6"/>','alert':'<path d="m12 3 10 18H2zM12 9v5M12 17v1"/>','filter':'<path d="M4 6h16M7 12h10M10 18h4"/>','clock':'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>','grid':'<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>','upload':'<path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6"/>','settings':'<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="18" r="2"/>','leaf':'<path d="M4 20C1 4 12 3 21 3c0 11-4 19-17 17ZM4 20 16 8"/>','sun':'<circle cx="12" cy="12" r="4"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3M4 4l2 2M18 18l2 2M20 4l-2 2M6 18l-2 2"/>','qr':'<path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h3v3h3v3h-6z"/>','dots':'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>'}.get(name,'<circle cx="12" cy="12" r="8"/>')
  self.parts.append(f'<g transform="translate({x} {y}) scale({size/24})" fill="none" stroke="{color or C["ink"]}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">{p}</g>')
 def pill(self,x,y,w,label,fill=None,color=None,h=36):
  self.rect(x,y,w,h,fill or C['white'],h/2);self.text(x+w/2,y+h/2+5,label,13,color or C['ink'],550,anchor='middle')
 def button(self,x,y,w,label,style='primary',h=48,icon=None):
  bg=C['green'] if style=='primary' else C['pale'] if style=='soft' else C['white']
  fg=C['white'] if style=='primary' else C['green']
  self.rect(x,y,w,h,bg,8,C['line'] if style=='outline' else None)
  self.text(x+w/2-(10 if icon else 0),y+h/2+5,label,15,fg,600,anchor='middle')
  if icon:self.icon(icon,x+w-32,y+(h-20)/2,fg)
 def photo(self,name,x,y,w,h,rx=12):
  self.n+=1;key=f'{self.key}-img{self.n}';data=base64.b64encode((ROOT/'assets'/f'{name}.jpg').read_bytes()).decode()
  self.parts.append(f'<defs><clipPath id="{key}"><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}"/></clipPath></defs><image x="{x}" y="{y}" width="{w}" height="{h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#{key})" href="data:image/jpeg;base64,{data}"/>')
 def glass(self,x,y,w,h,rx=14,alpha=.94):
  # Low-opacity vector layers preserve editable depth on SVG import.
  # Runtime: white .94 + backdrop blur 16px; reduced transparency: opaque white.
  for step in range(28,0,-1):
   grow=step*.5;dy=5;opacity=.004+.002*(1-step/29)**2
   self.parts.append(f'<rect x="{x-grow}" y="{y+dy-grow}" width="{w+grow*2}" height="{h+grow*2}" rx="{rx+grow}" fill="#000000" fill-opacity="{opacity}"/>')
  self.parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="#FFFFFF" fill-opacity="{alpha}" stroke="#FFFFFF" stroke-opacity=".92"/>')
  self.line(x+rx,y+1,x+w-rx,y+1,'#FFFFFF')
 def language(self,x=310,y=48,label='EN'):
  # 50x28 visual; implementation hit area 56x44 centred on it.
  self.rect(x,y,50,28,'#FFFFFF',6)
  self.text(x+12,y+18,label,12,weight=550);self.icon('down',x+32,y+8,size=12)
 def shell(self,title='HaChi Kyu',table='Table 05'):
  self.text(24,28,'9:41',13,weight=600)
  self.text(24,68,'Shop AI',16,weight=650);self.language()
  self.text(24,123,title,35,weight=600);self.text(24,148,table+' / Dine in',12,C['muted'])
 def nav(self,active='Menu',y=824,w=390):
  begin=len(self.parts);self.glass(16,y-10,w-32,70,16)
  labels=[('Menu','menu'),('Ask AI','chat'),('My picks','bag'),('Staff','bell')]
  for i,(label,ico) in enumerate(labels):
   cx=16+(w-32)*(i+.5)/4
   self.icon(ico,cx-10,y+1,C['ink'] if label==active else C['muted'],20)
   self.text(cx,y+43,label,11,C['ink'] if label==active else C['muted'],650 if label==active else 400,anchor='middle')
   if label==active:self.circle(cx,y+51,1.5,C['ink'])
  content=''.join(self.parts[begin:]);del self.parts[begin:];self.group('Glass navigation',content)
 def header(self,title,sub=None):
  self.rect(0,0,self.w,106,C['bg']);self.icon('back',24,57);self.text(58,77,title,24,weight=600)
  if sub:self.text(58,98,sub,12,C['muted'])
  self.line(24,112,self.w-24,112)
 def group(self,name,content):self.parts.append(f'<g id="{escape(name)}">{content}</g>')
 def svg(self):return f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{self.w}" height="{self.h}" viewBox="0 0 {self.w} {self.h}"><title>{escape(self.key)}</title>'+''.join(self.parts)+'</svg>'

screens=[]
def save(c,name):
 p=ROOT/'screens'/f'{name}.svg';p.write_text(c.svg());screens.append((name,c))
 # SVG drawings are rendered as previews; no photo content is edited.
 doc=fitz.open(stream=c.svg().encode(),filetype='svg');pdf=fitz.open('pdf',doc.convert_to_pdf());scale=min(1.7,1600/c.w)
 pdf[0].get_pixmap(matrix=fitz.Matrix(scale,scale)).save(str(ROOT/'previews'/f'{name}.png'))

# Diner: menu typography, generous rows and restrained controls.
c=Canvas(390,900,'Diner Menu');c.shell()
begin=len(c.parts);c.glass(24,173,342,46,12);c.icon('chat',38,187,size=18);c.text(67,202,'Ask AI about the menu…',14,C['muted']);c.icon('down',333,187,size=18);content=''.join(c.parts[begin:]);del c.parts[begin:];c.group('Ask AI bar / collapsed',content)
for x,t,active in [(24,'All',True),(83,'Sushi',False),(158,'Sashimi',False),(257,'Small plates',False)]:
 c.text(x,253,t,14,C['ink'] if active else C['muted'],600 if active else 400)
 if active:c.line(x,263,x+26,263,C['ink'],2)
c.line(24,272,366,272);c.icon('alert',24,286,size=17);c.text(51,300,'Allergy profile',13,weight=550);c.icon('next',347,286,size=17)
c.text(24,348,'Sushi',24,weight=600);c.text(366,347,'2 dishes',12,C['muted'],anchor='end')
for y,img,name,allergen in [(369,'salmon-sushi','Salmon Sushi','Fish'),(520,'tuna-sushi','Tuna Sushi','Fish')]:
 c.photo(img,24,y,112,112,8);c.text(156,y+23,name,18,weight=550);c.text(156,y+48,'1 piece / Est. '+allergen.lower(),12,C['muted']);c.text(156,y+91,'THB 96',17,weight=600);c.rect(322,y+68,44,44,C['ink'],8);c.icon('plus',334,y+80,C['white'],20);c.line(156,y+133,366,y+133)
c.text(24,707,'Small plates',24,weight=600);c.text(366,706,'Ask the menu',12,C['muted'],anchor='end')
c.photo('edamame',24,730,112,112,8);c.text(156,754,'Edamame',18,weight=550);c.text(156,779,'Est. soy',12,C['muted']);c.text(156,816,'THB 96',17,weight=600);c.rect(322,798,44,44,C['ink'],8);c.icon('plus',334,810,C['white'],20)
c.nav();save(c,'01-diner-menu')
# Dish detail.
c=Canvas(390,900,'Dish Details');c.rect(0,0,390,302,C['white']);c.photo('salmon-sushi',75,66,240,192,0);c.text(195,278,'Reference photo · price is for one piece',11,C['muted'],anchor='middle');c.circle(46,71,23,C['white']);c.icon('back',35,60);c.circle(344,71,23,C['white']);c.icon('heart',333,60)
c.rect(0,296,390,604,C['bg']);c.text(24,337,'Salmon Sushi',28,weight=550);c.text(24,364,'Sushi / 1 piece',14,C['muted']);c.text(366,337,'THB 96',18,weight=600,anchor='end')
c.lines(24,395,['One piece of salmon nigiri.','Recipe details are estimates.'],16,gap=26)
c.line(24,447,366,447);c.text(24,478,'Ingredients',16,weight=650);c.lines(24,505,['Sushi rice (vinegar, sugar, salt),','salmon'],14,C['muted'],gap=20)
c.rect(24,535,342,110,C['rose'],8);c.icon('alert',40,551,C['red'],20);c.text(70,570,'Estimated allergen list: fish',15,C['red'],650);c.lines(40,598,['Recipe estimates are not staff-verified.','Confirm with staff before ordering.'],13,C['red'],gap=22)
c.button(24,665,342,'Ask AI about this dish','outline',48,'chat');c.text(24,752,'Quantity',15,weight=600)
c.rect(240,729,126,44,C['white'],10,C['line']);c.icon('minus',251,741);c.text(303,758,'1',16,weight=600,anchor='middle');c.icon('plus',332,741)
c.glass(16,801,358,88,14);c.button(24,810,342,'Add to my picks · THB 96',h=54);c.text(195,881,'Review before sending to staff.',11,C['muted'],anchor='middle');save(c,'02-dish-detail')
# Chat, with structured factual answer.
c=Canvas(390,900,'Ask AI');c.header('Ask AI','HaChi Kyu · Menu assistant');c.text(24,28,'9:41',13,weight=600)
c.pill(24,129,184,'Profile: avoiding peanut',C['sand'],C['amber'],36)
c.rect(75,190,291,68,C['green'],8);c.lines(91,216,['Something light under THB 100,','without peanut?'],15,C['white'],gap=23)
c.circle(39,295,15,C['pale']);c.icon('chat',29,285,C['green'],20);c.text(65,300,'Shop AI',14,weight=650)
c.lines(24,337,['These dishes are under THB 100 and do','not list peanut in the menu estimates.'],16,gap=25)
c.lines(24,397,['Please confirm with staff before ordering.'],13,C['amber'])
for y,img,title,price,al in [(423,'salmon-sushi','Salmon Sushi',96,'1 piece / Est. fish'),(550,'edamame','Edamame',96,'Est. soy')]:
 c.line(24,y-8,366,y-8);c.photo(img,34,y+11,86,89,8);c.text(134,y+29,title,16,weight=600);c.text(134,y+52,al,12,C['muted']);c.text(134,y+83,f'THB {price}',17,weight=650);c.rect(309,y+58,44,44,C['pale'],10);c.icon('plus',321,y+68,C['green'],20)
c.text(24,688,'Recipe estimates · Confirm with staff',11,C['muted']);c.icon('check',24,705,C['muted'],16);c.text(47,718,'Helpful',12,C['muted']);c.text(130,718,'Not helpful',12,C['muted'])
c.glass(24,750,292,52,10);c.text(40,782,'Ask about the menu…',14,C['muted']);c.rect(322,750,44,52,C['green'],12);c.icon('arrow',335,766,C['white'],20);c.nav('Ask AI');save(c,'03-ai-conversation')
# Picks.
c=Canvas(390,900,'Review Picks');c.header('My picks','HaChi Kyu · Table 05');c.text(24,152,'Review your selection',23,weight=550);c.text(24,181,'Not sent to staff yet',14,C['muted'])
for y,img,title,qty,unit in [(208,'salmon-sushi','Salmon Sushi',2,96),(339,'miso-soup','Miso Soup',1,42)]:
 c.photo(img,24,y,82,87,10);c.text(120,y+22,title,16,weight=600);c.text(120,y+48,f'THB {unit} each',13,C['muted']);c.text(366,y+22,f'THB {qty*unit}',16,weight=650,anchor='end');c.rect(120,y+60,128,44,C['white'],10,C['line']);c.icon('minus',132,y+72,size=19);c.text(184,y+89,str(qty),15,weight=600,anchor='middle');c.icon('plus',219,y+72,size=19);c.line(24,y+117,366,y+117)
c.rect(24,490,342,128,C['sand'],8);c.icon('alert',40,507,C['amber']);c.text(70,524,'Your allergy profile: peanut',15,C['amber'],600);c.lines(40,553,['We will share this with staff.','They will confirm before taking your order.'],13,C['amber'],gap=23);c.text(40,600,'Edit allergy profile',13,C['amber'],650)
c.text(24,661,'3 items',15,C['muted']);c.text(366,663,'THB 234',25,weight=650,anchor='end');c.text(24,697,'Staff will confirm your picks and total.',13,C['muted'])
c.glass(16,782,358,102,14);c.text(32,805,'Sending to Table 05',13,weight=600);c.button(24,818,342,'Send to staff · THB 234',h=54,icon='arrow');save(c,'04-review-picks')
# Sent state: distinguish received from confirmed.
c=Canvas(390,900,'Picks Sent');c.text(24,28,'9:41',13,weight=600);c.text(24,77,'Shop AI',18,weight=650);c.pill(269,51,97,'Table 05',C['white'],h=36)
c.circle(195,207,49,C['pale']);c.icon('check',172,184,C['green'],46);c.text(195,304,'Sent to staff',32,weight=550,anchor='middle');c.lines(195,345,['Your picks are waiting for staff to confirm.'],14,C['muted']);c.parts[-1]=c.parts[-1].replace('text-anchor="start"','text-anchor="middle"')
c.glass(24,392,342,209,12);c.text(44,426,'Table 05 · 3 items',16,weight=650);c.line(44,446,346,446);c.text(44,478,'2 × Salmon Sushi',15);c.text(346,478,'THB 192',15,anchor='end');c.text(44,515,'1 × Miso Soup',15);c.text(346,515,'THB 42',15,anchor='end');c.line(44,536,346,536);c.text(44,572,'Estimated total',14,C['muted']);c.text(346,573,'THB 234',20,weight=650,anchor='end')
c.icon('alert',26,629,C['amber'],19);c.text(55,644,'Peanut allergy shared with staff',13,C['amber'],600)
c.button(24,707,342,'Back to the menu',h=52);c.button(24,773,342,'Call staff','outline',52,'bell');c.text(195,867,'Need to change something? Speak with staff.',12,C['muted'],anchor='middle');save(c,'05-picks-sent')
# Waiter phone. Operational density, no lifestyle imagery.
c=Canvas(430,932,'Waiter Floor');c.text(24,31,'Shop AI',18,weight=650);c.pill(302,11,104,'Floor staff',C['pale'],h=34);c.text(24,91,'Floor',34,weight=550);c.circle(31,118,4,C['green']);c.text(43,123,'Live · Updated 14:32:08',12,C['muted']);c.icon('dots',378,70)
for x,w,label,sel in [(24,127,'Feed · 4',1),(159,117,'Tables',0),(284,122,'Bills · 2',0)]:c.pill(x,148,w,label,C['green'] if sel else C['white'],C['white'] if sel else C['ink'],44)
c.text(24,221,'Needs attention',17,weight=650)
c.line(24,239,406,239);c.pill(40,254,81,'Table 03',C['sand'],C['amber'],30);c.text(389,276,'Waiting 6 min',12,C['amber'],600,anchor='end');c.text(40,311,'A guest needs help',17,weight=600);c.button(278,297,112,'Done','soft',44)
c.glass(24,372,382,274,12);c.pill(40,389,81,'Table 05',C['pale'],h=30);c.text(389,410,'Picks · 2 min',12,C['muted'],anchor='end');c.text(40,452,'2 × Salmon Sushi',17,weight=600);c.text(40,485,'1 × Miso Soup',17,weight=600)
c.rect(40,509,350,66,C['sand'],9);c.icon('alert',54,523,C['amber'],20);c.text(84,533,'Peanut allergy',15,C['amber'],650);c.text(54,557,'Confirm with guest and kitchen.',13,C['amber'])
c.button(40,590,230,'Take order',h=44);c.button(280,590,110,'Dismiss','outline',44)
c.line(24,662,406,662);c.pill(40,677,81,'Table 08',C['white'],h=30);c.text(40,738,'2 dishes ready to serve',16,weight=600);c.button(286,720,104,'Served',h=44)
c.glass(16,824,398,88,12);c.text(24,857,'Sold out today',15,weight=650);c.text(24,886,'Coconut Ice Cream',13,C['muted']);c.button(290,845,116,'Manage','outline',44);save(c,'06-waiter-floor')
# Owner desktop: actionable menu quality, not decorative analytics.
c=Canvas(1440,960,'Owner Menu');c.rect(0,0,224,960,C['green']);c.text(28,53,'Shop AI',26,C['white'],650);c.text(28,85,'HaChi Kyu',14,'#D0D0D0')
for i,(label,ico) in enumerate([('Menu','menu'),('Import menu','upload'),('Insights','grid'),('Hours & specials','clock'),('FAQ & rules','chat'),('AI settings','settings'),('QR codes','qr'),('Staff','bell')]):
 y=137+i*58
 if i==0:c.rect(16,y-28,192,46,'#303030',10)
 c.icon(ico,29,y-18,C['white'],20);c.text(64,y,label,14,C['white'],600 if i==0 else 450)
c.line(24,764,200,764,'#555555');c.text(28,800,'Your restaurant is live',13,'#D0D0D0');c.text(28,835,'View diner menu',14,C['white'],600);c.icon('arrow',178,820,C['white']);c.text(28,913,'Owner workspace',12,'#D0D0D0')
c.rect(224,0,1216,76,C['white']);c.text(260,46,'Restaurant / Menu',14,C['muted']);c.button(1214,16,190,'Test the assistant','soft',44,'chat')
c.text(264,145,'Menu',38,weight=550);c.text(264,180,'Dishes, availability and allergen information.',15,C['muted']);c.button(1196,117,204,'Add a dish',h=48,icon='plus')
c.rect(264,213,1136,91,C['sand'],8);c.icon('alert',284,233,C['amber'],23);c.text(322,244,'18 dishes need allergen information',17,C['amber'],650);c.text(322,274,'Missing information stays unknown. Confirm recipes with your kitchen.',14,C['amber']);c.button(1212,235,166,'Review dishes','outline',46)
c.rect(264,332,352,46,C['white'],10,C['line']);c.icon('search',280,345,size=20);c.text(312,361,'Search menu',14,C['muted']);c.pill(634,335,146,'All categories',C['white'],h=44);c.icon('down',752,347,size=16);c.pill(796,335,118,'All dishes',C['green'],C['white'],44);c.pill(925,335,169,'Missing data · 18',C['white'],h=44);c.text(1400,361,'132 dishes',14,C['muted'],anchor='end')
c.glass(264,401,1136,476,12);c.rect(264,401,1136,48,C['pale'],0)
for x,t in [(288,'Dish'),(746,'Price'),(861,'Allergens (estimated)'),(1131,'Availability')]:c.text(x,431,t,13,weight=650)
rows=[('salmon-sushi','Salmon Sushi','Sushi',96,'Fish','Available'),('tuna-sushi','Tuna Sushi','Sushi',96,'Fish','Available'),('gyoza','Gyoza','Small plates',96,'Gluten, soy, sesame','Available'),('edamame','Edamame','Small plates',96,'Soy','Available'),('miso-soup','Miso Soup','Soup',42,'Fish, soy','Available')]
for i,(img,title,cat,price,al,status) in enumerate(rows):
 y=449+i*84
 c.photo(img,288,y+12,60,60,8);c.text(366,y+34,title,16,weight=600);c.text(366,y+59,cat,13,C['muted']);c.text(746,y+46,f'THB {price}',16,weight=600);c.text(861,y+46,al,14,C['muted']);c.pill(1124,y+23,125,status,C['pale'],C['green'],34);c.icon('dots',1350,y+29,size=22)
 if i<4:c.line(288,y+84,1376,y+84)
c.text(264,917,'Illustrative workspace · Menu content and prices from the project seed.',12,C['muted']);save(c,'07-owner-menu')
# Kitchen desktop: explicit states, big action and allergy warning.
c=Canvas(1280,900,'Kitchen Board');c.rect(0,0,1280,98,C['dark']);c.text(28,39,'Shop AI',21,C['white'],650);c.text(28,76,'Kitchen',27,C['white'],600);c.circle(1044,36,4,'#FFFFFF');c.text(1058,41,'Live · 14:32:08',12,'#D0D0D0');c.text(1228,77,'14:32',25,C['white'],600,anchor='end')
c.text(28,133,'Lunch service',15,C['muted']);c.button(1071,111,181,'Sold out · 1','outline',44)
for x,title,n,fill in [(28,'New',2,C['sand']),(444,'Cooking',2,C['pale']),(860,'Ready',1,C['white'])]:
 c.text(x,191,title,24,weight=650);c.pill(x+337,166,50,str(n),fill,h=32);c.line(x,208,x+392,208)
def ticket(x,y,table,elapsed,lines,action,allergy=False,late=False,h=275):
 c.glass(x,y,392,h,10);c.text(x+20,y+40,'Table '+table,25,weight=650);c.pill(x+267,y+16,105,elapsed,C['rose'] if late else C['pale'],C['red'] if late else C['green'],36);c.text(x+20,y+68,'#104'+table+' · Dine in',12,C['muted'])
 ly=y+102
 for t in lines:c.text(x+20,ly,t,17,weight=550);ly+=33
 if allergy:
  c.rect(x+20,ly-4,352,65,C['sand'],9);c.icon('alert',x+33,ly+9,C['amber']);c.text(x+62,ly+24,'Peanut allergy',16,C['amber'],650);c.text(x+33,ly+47,'Check with floor staff before cooking.',12,C['amber'])
 c.button(x+20,y+h-64,352,action,h=46)
 if late:c.text(x+20,y+h-78,'Over 10 min · Needs attention',12,C['red'],600)
ticket(28,229,'05','2 min',['2 × Salmon Sushi','1 × Miso Soup'],'Start preparing',True,h=306)
ticket(28,555,'12','1 min',['1 × Gyoza'],'Start preparing',h=224)
ticket(444,229,'03','11 min',['2 × Tuna Sushi','1 × Edamame'],'Mark ready',late=True,h=284)
ticket(444,533,'09','4 min',['1 × Seared Salmon Sushi'],'Mark ready',h=246)
ticket(860,229,'08','1 min',['2 × Salmon Sushi'],'Mark served',h=248);c.button(880,496,352,'Recall to preparing','outline',44)
c.text(28,865,'Allergy notes remain visible on every ticket. Sound alerts supplement the screen.',13,C['muted']);save(c,'08-kitchen-board')
# Design foundations: design artifact, not a production page.
c=Canvas(1440,960,'Design Foundations');c.text(56,80,'Black. White. A little depth.',43,weight=550);c.text(56,124,'A quieter restaurant interface. Food, clear type and carefully placed glass.',19,C['muted']);c.line(56,157,1384,157)
c.text(56,205,'The palette',23,weight=600)
for i,(key,label) in enumerate([('white','White / #FFFFFF'),('bg','Canvas / #F5F5F5'),('ink','Ink / #141414'),('muted','Secondary / #626262'),('sand','Notice / #E8E8E8'),('line','Line / #DEDEDE')]):
 x=56+i*222;c.rect(x,232,194,91,C[key],12,C['line'] if key=='bg' else None);c.text(x,350,label,14,weight=550)
c.text(56,419,'Type carries the hierarchy.',29,weight=550);c.text(56,459,'Helvetica Neue / interface · Noto Sans Thai + Myanmar / localized text',16,C['muted']);c.text(56,500,'Body 16 / 24 · Labels 13 / 20 · Titles 24–34 · Staff table numbers 25+',15)
c.text(56,563,'Controls that say what happens',23,weight=600);c.button(56,590,223,'Send to staff',h=52,icon='arrow');c.button(299,590,223,'Ask AI','soft',52,'chat');c.button(542,590,223,'Call staff','outline',52,'bell');c.pill(789,598,180,'Data not provided',C['sand'],C['amber'],36);c.pill(990,598,130,'Sold out',C['rose'],C['red'],36);c.language(1190,602);c.text(1190,654,'50 × 28 visual / 56 × 44 hit area',11,C['muted'])
c.text(56,702,'Compact controls. Intentional depth.',25,weight=550)
for x,ss in [(56,['44–56 px hit targets','8 px spacing rhythm','Glass only where layers overlap']),(503,['One clear primary action','Icon + label navigation','Visible loading and recovery']),(950,['Allergies are never “safe”','Picks need staff confirmation','Local scripts can grow vertically'])]:c.lines(x,748,ss,16,C['muted'],gap=35)
c.text(56,917,'Design concept · Demonstration values are illustrative. Components are shown as drawings, not a published library.',12,C['muted']);save(c,'09-design-foundations')
# Research board.
c=Canvas(1440,960,'Research to Design');c.text(56,80,'Decisions behind the interface',40,weight=550);c.text(56,124,'Secondary research translated into decisions for Shop AI · 22 October 2026',18,C['muted']);c.line(56,155,1384,155)
items=[('Navigation should be recognizable.','NN/g · Icon usability',['Label Menu, Ask AI, My picks and Staff.','Keep language visible; remove icon guessing.']),('Allergy information needs a handoff.','Food Standards Agency / GOV.UK',['Show written allergen data and missing-data states.','Carry the profile to picks and kitchen; confirm with staff.']),('Waiting is part of the experience.','NN/g · Response-time limits',['Say “Checking the menu…” while work happens.','Keep browsing and calling staff available; avoid fake progress.']),('A kitchen needs priorities, not decoration.','Toast · KDS platform guide',['Group New / Cooking / Ready; show age and table.','Keep allergy notes and the next action on the ticket.']),('Touch and language need space.','W3C · WCAG 2.2 / Internationalization',['Use 44–56 px targets; 4.5:1 body contrast.','Allow Thai/Myanmar wrapping and extra line height.']),('Data quality is an owner’s task.','Repository review + Square availability patterns',['Put missing allergens beside the dish, with a clear fix.','Make availability a direct, clearly named control.'])]
for i,(title,src,ls) in enumerate(items):
 col=i%2;row=i//2;x=56+col*684;y=209+row*222
 c.text(x,y,title,23,weight=600);c.text(x,y+31,src,13,C['green'],600);c.lines(x,y+73,ls,16,C['muted'],gap=28);c.line(x,y+174,x+628,y+174)
c.text(56,912,'Desk research, not usability-test results. See RESEARCH.md for links, rationale, limitations and a test plan.',13,C['muted']);save(c,'10-research-to-design')
# Contextual recovery and safety states.
c=Canvas(1440,960,'Interaction States');c.text(56,80,'When service does not go to plan',40,weight=550);c.text(56,123,'Loading, recovery and uncertainty belong in the design.',18,C['muted']);c.line(56,154,1384,154)
def statebox(x,y,title,body,button,kind='normal',secondary=None):
 bg=C['sand'] if kind=='warning' else C['rose'] if kind=='error' else C['white']
 col=C['amber'] if kind=='warning' else C['red'] if kind=='error' else C['ink']
 c.rect(x,y,416,288,bg,12);c.icon('alert' if kind in ['warning','error'] else 'chat',x+22,y+22,col,24);c.text(x+22,y+77,title,21,col,600);c.lines(x+22,y+111,body,14,col,gap=24);c.button(x+22,y+218,372,button,'outline' if kind=='error' else 'primary',48)
 if secondary:c.text(x+22,y+198,secondary,13,col,600)
statebox(56,195,'Checking the menu…',['Your question is being processed.','You can keep browsing while I reply.'],'Browse the menu',secondary='Call staff instead')
statebox(512,195,'Showing a saved menu',['Prices or availability may have changed.','Reconnect before sending picks.'],'Try reconnecting','warning')
statebox(968,195,'No dishes match',['Try another search or clear your filters.','Your allergy profile will stay applied.'],'Clear search and filters')
statebox(56,543,'Could not confirm delivery',['Your picks may already have reached staff.','Please check before sending them again.'],'Call staff','error')
statebox(512,543,'Allergen information missing',['We cannot check this dish against your','profile. Please speak with the staff.'],'Call staff','warning')
statebox(968,543,'Sold out today',['This dish cannot be added right now.','Browse the menu for another option.'],'See available dishes')
c.text(56,906,'Design behavior: never stream unvalidated model claims; do not fake completion percentages or retry orders blindly.',13,C['muted']);save(c,'11-interaction-states')
# Native-script typography and the fourteen-allergen profile.
c=Canvas(1440,960,'Language and Allergy');c.text(56,80,'Three languages. One clear interface.',40,weight=550);c.text(56,122,'English, Thai and Burmese keep the same information hierarchy.',18,C['muted']);c.line(56,155,1384,155)
for x,label,dish,price,msg in [(56,'English','Salmon Sushi','THB 96',['Confirm with staff','before ordering.']),(512,'ไทย','ซูชิแซลม่อน','96 บาท',['กรุณายืนยันกับพนักงาน','ก่อนสั่งอาหาร']),(968,'မြန်မာ','ဆော်လမွန် ဆူရှီ','၉၆ ဘတ်',['ဝန်ထမ်းကို','မေးမြန်းပေးပါ။'])]:
 c.rect(x,185,416,198,C['white'],12);c.text(x+22,215,label,17,weight=650);c.text(x+22,255,dish,22,weight=600);c.text(x+22,285,price,16,C['green'],600);c.lines(x+22,327,msg,16,C['muted'],gap=28)
c.rect(56,415,640,494,C['white'],12);c.text(80,457,'Your allergies',25,font=D);c.text(80,486,'Saved on this device. Shared with staff when you send picks.',13,C['muted'])
allergens=[['Gluten','Shellfish','Egg','Fish','Peanut','Soy','Milk'],['Tree nuts','Celery','Mustard','Sesame','Sulphites','Lupin','Molluscs']]
for col,ls in enumerate(allergens):
 for i,label in enumerate(ls):
  x=80+col*294;y=506+i*44;sel=label in ['Peanut','Shellfish'];c.rect(x,y+4,24,24,C['green'] if sel else C['white'],5,None if sel else C['line']);c.text(x+38,y+23,label,15,weight=550)
  if sel:c.icon('check',x+3,y+7,C['white'],18)
c.button(80,839,592,'Apply allergy profile',h=48)
c.text(760,456,'Clear states. No false reassurance.',25,font=D);c.rect(760,487,624,101,C['sand'],12);c.icon('alert',782,507,C['amber']);c.text(817,527,'Lists peanut · conflicts with your profile',16,C['amber'],600);c.text(782,561,'The diner can choose it, with a warning; staff receive the context.',14,C['amber'])
c.rect(760,612,624,101,C['rose'],12);c.icon('alert',782,632,C['red']);c.text(817,652,'Allergen information not provided',16,C['red'],600);c.text(782,686,'Missing information does not mean the dish has no allergens.',14,C['red'])
c.lines(760,760,['Avoid “safe”, “allergen-free” and reassuring status badges.','Let labels grow vertically; do not truncate allergy warnings.','Keep the profile available from the menu and review step.'],15,C['muted'],gap=31)
c.text(56,944,'Script samples are shaped with installed Thai/Myanmar fonts and retained as Unicode in the source; native-speaker review remains required.',11,C['muted']);save(c,'12-language-and-allergy')
# Compact, anchored language selection rather than a full-screen modal.
c=Canvas(390,900,'Language Switcher');c.parts=list(screens[0][1].parts);begin=len(c.parts)
c.glass(196,86,170,158,10,.98)
for i,label in enumerate(['English','ไทย','မြန်မာ']):
 y=116+i*46;c.text(212,y,label,15,weight=400)
 if i==0:c.icon('check',333,y-15,size=17)
 if i<2:c.line(210,y+16,352,y+16)
content=''.join(c.parts[begin:]);del c.parts[begin:];c.group('Language menu / anchored popover',content);save(c,'13-language-switcher')
# Liquid AI states, retaining the same menu underneath for continuity.
for answer in [False,True]:
 c=Canvas(390,900,'Inline AI / '+('Answer' if answer else 'Open'));c.parts=list(screens[0][1].parts)
 c.glass(24,233,342,385 if answer else 299,22,.98);c.text(43,270,'Ask the menu',18,weight=550);c.icon('close',329,251,size=18);c.text(43,296,'Recipe estimates. Staff confirm allergies.',12,C['muted'])
 c.rect(42,314,306,50,C['white'],10,C['line']);c.text(54,345,'Under THB 100' if answer else 'What would you like to know?',13,C['ink'] if answer else C['muted']);c.rect(300,317,44,44,C['ink'],8);c.icon('arrow',313,330,C['white'],18)
 if answer:
  c.lines(43,395,['These dishes are under THB 100.','Recipe and allergen details are estimates.'],13,gap=21)
  for y,img,title,al in [(437,'salmon-sushi','Salmon Sushi','Est. fish'),(505,'edamame','Edamame','Est. soy')]:
   c.photo(img,43,y,49,49,7);c.text(103,y+18,title,14,weight=550);c.text(103,y+39,'THB 96 / '+al,11,C['muted']);c.rect(300,y+3,44,44,C['ink'],8);c.icon('plus',312,y+15,C['white'],20)
  c.text(43,589,'Sample reply. Confirm allergies with staff.',11,C['muted'])
 else:
  c.button(42,386,306,'Under THB 100','soft',44);c.button(42,442,306,'What contains fish?','outline',44);c.text(43,513,'Ask about portions, prices or ingredients.',11,C['muted'])
 save(c,'15-inline-ai-answer' if answer else '14-inline-ai-open')
# Motion direction is a storyboard; the actual interaction study is motion/index.html.
c=Canvas(1440,960,'Liquid Motion');c.text(56,80,'Water, in the way it moves.',40,weight=550);c.text(56,122,'Monochrome glass / menu AI expansion / responsive feedback',18,C['muted']);c.line(56,155,1384,155)
for i,(title,ms,w,h,dy) in enumerate([('Touch', '0 ms',230,44,0),('Drop','120 ms',230,44,0),('Stretch','260 ms',230,145,0),('Settle','480 ms',230,145,0)]):
 x=56+i*342;c.text(x,204,title,22,weight=550);c.text(x+230,203,ms,12,C['muted'],anchor='end');c.glass(x,230,230,44,12);c.text(x+20,258,'Ask AI about the menu…',12,C['muted'])
 if i==1:c.circle(x+115,298,12,C['white']);c.parts.append(f'<ellipse cx="{x+115}" cy="310" rx="8" ry="14" fill="#FFFFFF"/>')
 if i>=2:
  c.glass(x,294,230,h,30 if i==2 else 20,.98);c.text(x+17,326,'Ask the menu',16,weight=550);c.line(x+17,347,x+213,347);c.text(x+17,377,'Ask about portions or ingredients',11,C['muted']);c.button(x+17,389,196,'Under THB 100','soft',36)
 c.line(x,465,x+240,465)
c.text(56,535,'One liquid language, different amounts of energy.',25,weight=550)
rows=[('Button / press','120–160 ms','Compress gently; release to rest. A soft ripple marks touch.'),('Category / quantity','160–240 ms','Retarget from the current position. No waiting for repeat taps.'),('Page / destination','240 ms','Shallow stretch and crossfade; keep navigation stable.'),('Language / dish sheet','240–300 ms','Expand from the trigger; dismiss along the same path.'),('Inline AI / focal reveal','480 ms in / 180 ms out','One drop, a controlled stretch, then a quiet settled panel.'),('Reduced motion','120 ms opacity','No drop, ripple, stretch or travel. Keep feedback legible.')]
for i,(a,b,d) in enumerate(rows):
 y=582+i*47;c.text(56,y,a,15,weight=550);c.text(362,y,b,14,C['muted']);c.text(614,y,d,14,C['muted']);c.line(56,y+17,1384,y+17)
c.text(56,915,'Live interaction study: motion/index.html · Sample AI replies / simulated actions · Real blur and interruption handling live in the demo.',12,C['muted']);save(c,'16-liquid-motion')
# A board with individual named groups; its UI remains vector content, not a flattened screenshot.
board=Canvas(3240,5560,'Shop AI UI UX Redesign')
board.text(64,95,'Shop AI',58,weight=550);board.text(64,139,'Monochrome / Glass / Restaurant',24,C['muted']);board.text(3176,102,'MONOCHROME REVISION',15,C['muted'],600,anchor='end');board.text(3176,136,'22 October 2026',15,C['muted'],anchor='end')
positions=[(64,224),(516,224),(968,224),(1420,224),(1872,224),(2324,224),(64,1268),(1572,1268),(64,2350),(1572,2350),(64,3430),(1572,3430),(2776,224),(64,4510),(516,4510),(968,4510)]
for (name,cv),(x,y) in zip(screens,positions):
 board.text(x,y-22,name.replace('-',' ').title(),16,C['muted'],600)
 board.parts.append(f'<defs><clipPath id="viewport-{name}"><rect width="{cv.w}" height="{cv.h}"/></clipPath></defs><g id="{name}" transform="translate({x} {y})" clip-path="url(#viewport-{name})">'+''.join(cv.parts)+'</g>')
(ROOT/'shop-ai-redesign-board.svg').write_text(board.svg())
# Gallery is a local preview and does not change the real app.
css='''*{box-sizing:border-box}body{margin:0;padding:40px;background:#e7e7e7;color:#141414;font:16px Inter,Arial,sans-serif}h1{font:550 44px Helvetica Neue,Arial,sans-serif;margin:0 0 12px}p{color:#626262}nav{display:flex;gap:12px;flex-wrap:wrap;margin:24px 0}a{color:#151515}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:32px}figure{margin:0;background:#f5f5f5;border-radius:16px;padding:20px}figure.wide{grid-column:1/-1}img{display:block;width:100%;height:auto}figure:not(.wide) img{max-width:430px;margin:auto}figcaption{font-size:14px;padding:16px 0 0}button{font:inherit;padding:10px 16px;border:1px solid #dedede;background:white;border-radius:8px;cursor:pointer}@media(max-width:600px){body{padding:20px}h1{font-size:32px}}'''
figs=''.join(f'<figure class="{"wide" if cv.w>500 else ""}" id="{name}"><img src="screens/{name}.svg" alt="{name.replace("-"," ")}"><figcaption>{name.replace("-"," ").title()} · {cv.w} × {cv.h}</figcaption></figure>' for name,cv in screens)
(ROOT/'index.html').write_text(f'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Shop AI — UI UX concepts</title><style>{css}</style><h1>Shop AI / Monochrome glass</h1><p>Shop AI design concept · Liquid motion study, inline menu AI states and the monochrome interface system.</p><nav><a href="RESEARCH.md">Research</a><a href="HANDOFF.md">Design handoff</a><a href="motion/">Play liquid motion demo</a><a href="shop-ai-redesign-board.svg">Complete vector board</a></nav><main>{figs}</main></html>')
print('Built',len(screens),'SVG drawings, PNG previews, complete board and local gallery.')
